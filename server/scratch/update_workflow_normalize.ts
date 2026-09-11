import * as fs from 'fs';
import * as path from 'path';

const filesToUpdate = [
  'working _JD.json',
  'working 2_new.json',
  'working 2.json',
  'enterprise_workflow.json'
];

const newJsCode = `const normMap = {
  'javascript': 'JavaScript', 'java script': 'JavaScript', 'js': 'JavaScript',
  'typescript': 'TypeScript', 'ts': 'TypeScript',
  'react': 'React', 'reactjs': 'React', 'react.js': 'React',
  'angularjs': 'Angular', 'angular.js': 'Angular',
  'vuejs': 'Vue.js', 'vue': 'Vue.js',
  'node': 'Node.js', 'nodejs': 'Node.js', 'node js': 'Node.js',
  'expressjs': 'Express.js', 'express': 'Express.js',
  'nextjs': 'Next.js', 'next': 'Next.js',
  'postgres': 'PostgreSQL', 'postgresql': 'PostgreSQL',
  'mongo': 'MongoDB', 'mongodb': 'MongoDB',
  'python3': 'Python', 'py': 'Python',
  'mysql': 'MySQL', 'my sql': 'MySQL',
  'amazon web services': 'AWS',
  'tailwind': 'Tailwind CSS', 'tailwindcss': 'Tailwind CSS',
  'bootstrap4': 'Bootstrap', 'bootstrap5': 'Bootstrap',
  'cpp': 'C++', 'c plus plus': 'C++',
  'csharp': 'C#', 'c sharp': 'C#',
  'golang': 'Go',
  'tensorflow': 'TensorFlow',
  'pytorch': 'PyTorch',
  'github actions': 'GitHub Actions',
  'ci/cd': 'CI/CD', 'cicd': 'CI/CD',
};

function normalizeSkillList(skillStr) {
  if (!skillStr || typeof skillStr !== 'string') return skillStr || '';
  return skillStr.split(',')
    .map(s => {
      const trimmed = s.trim();
      const key = trimmed.toLowerCase().replace(/[.\\s-]/g, '');
      for (const [pattern, canonical] of Object.entries(normMap)) {
        if (key === pattern.replace(/[.\\s-]/g, '')) return canonical;
      }
      return trimmed;
    })
    .filter(Boolean)
    .filter((v, i, arr) => arr.findIndex(x => x.toLowerCase() === v.toLowerCase()) === i)
    .join(', ');
}

function normalizeDegree(degreeStr) {
  if (!degreeStr || typeof degreeStr !== 'string') return '';
  const s = degreeStr.trim().toLowerCase().replace(/[.\\s-]/g, '');
  if (s === 'btech' || s === 'bacheloroftechnology' || s === 'be' || s === 'bachelorofengineering') return 'B.Tech';
  if (s === 'mtech' || s === 'masteroftechnology' || s === 'me' || s === 'masterofengineering') return 'M.Tech';
  if (s === 'mca' || s === 'masterofcomputerapplications') return 'MCA';
  if (s === 'bca' || s === 'bachelorofcomputerapplications') return 'BCA';
  if (s === 'bsc' || s === 'bachelorofscience') return 'B.Sc';
  if (s === 'msc' || s === 'masterofscience') return 'M.Sc';
  return degreeStr.trim().split(/\\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function normalizeCity(cityStr) {
  if (!cityStr || typeof cityStr !== 'string') return '';
  const s = cityStr.trim().toLowerCase();
  if (s === 'indore') return 'Indore';
  if (s === 'bhopal') return 'Bhopal';
  if (s === 'pune') return 'Pune';
  if (s === 'bangalore' || s === 'bengaluru') return 'Bengaluru';
  if (s === 'mumbai') return 'Mumbai';
  if (s === 'delhi' || s === 'new delhi') return 'Delhi';
  if (s === 'hyderabad') return 'Hyderabad';
  if (s === 'chennai') return 'Chennai';
  if (s === 'kolkata') return 'Kolkata';
  return cityStr.trim().split(/\\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function normalizeCollege(collegeStr) {
  if (!collegeStr || typeof collegeStr !== 'string') return '';
  const s = collegeStr.trim().toLowerCase().replace(/[.,-\\s]/g, '');
  if (s.includes('sgsits') || s.includes('govindramseksaria')) return 'SGSITS';
  if (s.includes('ietdavv') || (s.includes('iet') && s.includes('davv'))) return 'IET DAVV';
  if (s.includes('ipsacademy') || s.includes('ipsindore')) return 'IPS Academy';
  if (s.includes('medicaps')) return 'Medi-Caps University';
  if (s.includes('acropolis')) return 'Acropolis Institute';
  if (s.includes('svits')) return 'SVITS';
  if (s.includes('lnct')) return 'LNCT';
  return collegeStr.trim()
    .split(/\\s+/)
    .map(w => {
      const cleanWord = w.replace(/[(),]/g, '');
      if (cleanWord.length <= 4 && /^[a-z]+$/i.test(cleanWord) && cleanWord === cleanWord.toUpperCase()) {
        return w;
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

const rawInput = $input.item.json || {};
const d = rawInput.output || rawInput || {};

// Restore candidate contact details from Resume Validation & Hash node (index-aligned)
let contact = {};
try {
  contact = $('Resume Validation & Hash').item.json || {};
} catch (e) {
  contact = {};
}

// Convert camelCase to snake_case for Save Candidate postgres node inputs
return {
  json: {
    submitted_at: contact.submittedAt || contact.submitted_at || new Date().toISOString(),
    processed_at: new Date().toISOString(),
    source: contact.source || 'unknown',
    candidate_name: contact.candidateName || contact.candidate_name || 'Unknown',
    email: (contact.email || '').trim() || ('no-email-' + (contact.resumeHash || Date.now()) + '@hireflow.internal'),
    phone: contact.phone || '',
    position: contact.position || '',
    years_of_exp: Number(contact.yearsOfExp || contact.years_of_exp || d.totalExperienceYears || 0),
    linkedin: contact.linkedin || '',
    
    current_job_title: d.currentJobTitle || '',
    highest_degree: normalizeDegree(d.highestDegree || d.degree || ''),
    degree: normalizeDegree(d.degree || d.highestDegree || ''),
    college: normalizeCollege(d.college || ''),
    city: normalizeCity(d.city || ''),
    passout_year: parseInt(d.passoutYear) || null,
    internship_completed: (String(d.internship || '').toLowerCase().includes('yes') || Boolean(d.internshipCompany)),
    certifications: d.certifications || '',
    
    frontend_skills: normalizeSkillList(d.frontendSkills),
    frontend_level: d.frontendLevel || '',
    backend_skills: normalizeSkillList(d.backendSkills),
    backend_level: d.backendLevel || '',
    database_skills: normalizeSkillList(d.databaseSkills),
    database_level: d.databaseLevel || '',
    ai_ml_skills: normalizeSkillList(d.aiMlSkills),
    ai_ml_level: d.aiMlLevel || '',
    cloud_devops: normalizeSkillList(d.cloudDevOps),
    programming_langs: normalizeSkillList(d.programmingLanguages),
    notable_projects: d.notableProjects || '',
    
    resume_text: contact.resumeText || contact.resume_text || '',
    
    workdrive_file_id: contact.workdriveFileId || contact.workdrive_file_id || null,
    workdrive_file_name: contact.workdriveFileName || contact.workdrive_file_name || null,
    source_folder_id: contact.sourceFolderId || contact.source_folder_id || null,
    processed_folder_id: contact.processedFolderId || contact.processed_folder_id || null
  }
};`;

function updateWorkflows() {
  for (const filename of filesToUpdate) {
    const filePath = path.join(process.cwd(), filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${filename} not found, skipping.`);
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const workflow = JSON.parse(content);
      
      let foundNode = false;
      
      // n8n workflow nodes are in nodes array
      if (Array.isArray(workflow.nodes)) {
        for (const node of workflow.nodes) {
          if (node.name === 'Normalize Skills' && node.parameters) {
            node.parameters.jsCode = newJsCode;
            foundNode = true;
          }
        }
      }

      if (foundNode) {
        fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2), 'utf8');
        console.log(`Successfully updated "Normalize Skills" JS Code in ${filename}.`);
      } else {
        console.warn(`Could not find "Normalize Skills" node in ${filename}.`);
      }
    } catch (e) {
      console.error(`Error processing ${filename}:`, e);
    }
  }
}

updateWorkflows();
