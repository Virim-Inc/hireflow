import * as fs from 'fs';
import * as path from 'path';

interface WorkflowNode {
  name: string;
  type: string;
  parameters: any;
  [key: string]: any;
}

interface Workflow {
  nodes: WorkflowNode[];
  [key: string]: any;
}

function inspectNormalizeSkills() {
  const filePath = path.join(process.cwd(), 'working 2_new.json');
  const wf: Workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const normSkillsNode = wf.nodes.find(n => n.name === 'Normalize Skills');
  if (!normSkillsNode) {
    console.error('Normalize Skills node not found!');
    return;
  }

  console.log('--- Normalize Skills Node parameters ---');
  console.log(JSON.stringify(normSkillsNode.parameters, null, 2));
}

inspectNormalizeSkills();
