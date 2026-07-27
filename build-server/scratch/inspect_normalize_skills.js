import * as fs from 'fs';
import * as path from 'path';
function inspectNormalizeSkills() {
    const filePath = path.join(process.cwd(), 'working 2_new.json');
    const wf = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const normSkillsNode = wf.nodes.find(n => n.name === 'Normalize Skills');
    if (!normSkillsNode) {
        console.error('Normalize Skills node not found!');
        return;
    }
    console.log('--- Normalize Skills Node parameters ---');
    console.log(JSON.stringify(normSkillsNode.parameters, null, 2));
}
inspectNormalizeSkills();
//# sourceMappingURL=inspect_normalize_skills.js.map