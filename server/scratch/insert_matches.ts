import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function insertMatches() {
  const client = new Client({
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT || 5432),
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();

    // 1. Read extracted user input
    const txtPath = path.join(process.cwd(), 'server', 'scratch', 'extracted_user_input.txt');
    if (!fs.existsSync(txtPath)) {
      throw new Error('Extracted user input file does not exist!');
    }
    const rawText = fs.readFileSync(txtPath, 'utf8');

    // Find JSON array start and end
    const jsonStartIdx = rawText.indexOf('[');
    let jsonEndIdx = rawText.lastIndexOf(']');
    if (jsonStartIdx === -1) {
      throw new Error('Could not find JSON array start in user input text!');
    }

    let jsonStr = '';
    if (jsonEndIdx !== -1 && jsonEndIdx > jsonStartIdx) {
      jsonStr = rawText.substring(jsonStartIdx, jsonEndIdx + 1);
    } else {
      jsonStr = rawText.substring(jsonStartIdx);
    }

    let parsedList: any[] = [];
    try {
      parsedList = JSON.parse(jsonStr);
    } catch (err) {
      console.warn('Initial JSON parse failed (likely due to truncation). Attempting recovery of complete objects...');
      
      // Find the last complete object close '}'
      const lastCloseBrace = jsonStr.lastIndexOf('}');
      if (lastCloseBrace === -1) {
        throw new Error('Could not find any complete JSON objects to recover!');
      }

      // Truncate to the last complete object close
      let recoveredStr = jsonStr.substring(0, lastCloseBrace + 1);
      
      // If there is a trailing comma at the end, remove it
      recoveredStr = recoveredStr.trim();
      if (recoveredStr.endsWith(',')) {
        recoveredStr = recoveredStr.substring(0, recoveredStr.length - 1);
      }
      
      // Close the JSON array
      recoveredStr = recoveredStr + ']';
      
      try {
        parsedList = JSON.parse(recoveredStr);
        console.log('Successfully recovered truncated JSON array!');
      } catch (parseErr) {
        console.error('Failed to parse recovered JSON:', parseErr);
        console.error('Recovered string end snippet:', recoveredStr.substring(recoveredStr.length - 100));
        throw parseErr;
      }
    }

    console.log(`Parsed ${parsedList.length} matches from the user text.`);

    // 2. Fetch all valid candidate IDs from database to prevent foreign key errors
    const candRes = await client.query('SELECT id, candidate_name FROM candidates;');
    const validCandidates = new Map<number, string>(candRes.rows.map(r => [r.id, r.candidate_name]));
    console.log(`Valid candidate IDs in database:`, Array.from(validCandidates.keys()));

    let insertedCount = 0;
    let skippedCount = 0;

    for (let idx = 0; idx < parsedList.length; idx++) {
      const item = parsedList[idx];
      const candidateId = Number(item.candidate_id);
      
      // Override JD ID to 3 as requested
      const jdId = 3;

      if (!validCandidates.has(candidateId)) {
        console.warn(`[Skip] Candidate ID ${candidateId} does not exist in candidates table.`);
        skippedCount++;
        continue;
      }

      const name = validCandidates.get(candidateId);
      console.log(`Processing evaluation for candidate ID ${candidateId} (${name})...`);

      // Format arrays for matched/missing skills
      let matchedSkills = '[]';
      try {
        const parsed = typeof item.matched_skills === 'string' ? JSON.parse(item.matched_skills) : item.matched_skills;
        matchedSkills = JSON.stringify(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        matchedSkills = '[]';
      }

      let missingSkills = '[]';
      try {
        const parsed = typeof item.missing_skills === 'string' ? JSON.parse(item.missing_skills) : item.missing_skills;
        missingSkills = JSON.stringify(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        missingSkills = '[]';
      }

      const strengths = Array.isArray(item.strengths) ? item.strengths : [];
      const weaknesses = Array.isArray(item.weaknesses) ? item.weaknesses : [];

      const query = `
        INSERT INTO candidate_job_matches (
          candidate_id, jd_id, overall_score, technical_score, experience_score,
          education_score, communication_score, project_score, recommendation,
          grade, matched_skills, missing_skills, strengths, weaknesses,
          summary, status, scored_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        ) ON CONFLICT (candidate_id, jd_id) DO UPDATE SET
          overall_score = EXCLUDED.overall_score,
          technical_score = EXCLUDED.technical_score,
          experience_score = EXCLUDED.experience_score,
          education_score = EXCLUDED.education_score,
          communication_score = EXCLUDED.communication_score,
          project_score = EXCLUDED.project_score,
          recommendation = EXCLUDED.recommendation,
          grade = EXCLUDED.grade,
          matched_skills = EXCLUDED.matched_skills,
          missing_skills = EXCLUDED.missing_skills,
          strengths = EXCLUDED.strengths,
          weaknesses = EXCLUDED.weaknesses,
          summary = EXCLUDED.summary,
          status = EXCLUDED.status,
          scored_at = EXCLUDED.scored_at;
      `;

      const values = [
        candidateId,
        jdId,
        Number(item.overall_score || 0),
        Number(item.technical_score || 0),
        Number(item.experience_score || 0),
        Number(item.education_score || 0),
        Number(item.communication_score || 0),
        Number(item.project_score || 0),
        item.recommendation || 'Consider',
        item.grade || 'B',
        matchedSkills,
        missingSkills,
        strengths,
        weaknesses,
        item.summary || '',
        'Completed',
        item.scored_at || new Date().toISOString()
      ];

      await client.query(query, values);
      insertedCount++;
    }

    console.log(`Successfully completed insertion.`);
    console.log(`Inserted/Updated: ${insertedCount}`);
    console.log(`Skipped: ${skippedCount}`);

  } catch (err) {
    console.error('Error during matches insertion:', err);
  } finally {
    await client.end();
  }
}

insertMatches();
