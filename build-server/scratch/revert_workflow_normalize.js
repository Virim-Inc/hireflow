import * as fs from 'fs';
import * as path from 'path';
const filesToUpdate = [
    'working _JD.json',
    'working 2_new.json',
    'working 2.json',
    'enterprise_workflow.json'
];
const originalJsCode = `const normMap = {
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
    highest_degree: d.highestDegree || '',
    degree: d.degree || '',
    college: d.college || '',
    city: d.city || '',
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
function revertWorkflows() {
    for (const filename of filesToUpdate) {
        const filePath = path.join(process.cwd(), filename);
        if (!fs.existsSync(filePath)) {
            continue;
        }
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const workflow = JSON.parse(content);
            let foundNode = false;
            if (workflow && Array.isArray(workflow.nodes)) {
                for (const node of workflow.nodes) {
                    if (node.name === 'Normalize Skills' && node.parameters) {
                        node.parameters.jsCode = originalJsCode;
                        foundNode = true;
                    }
                }
            }
            if (foundNode) {
                fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2), 'utf8');
                console.log(`Successfully reverted "Normalize Skills" in ${filename}.`);
            }
        }
        catch (e) {
            console.error(`Error reverting ${filename}:`, e);
        }
    }
}
revertWorkflows();
//# sourceMappingURL=revert_workflow_normalize.js.map