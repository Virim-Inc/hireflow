import * as fs from 'fs';
import * as path from 'path';

interface Workflow {
  connections: Record<string, Record<string, Array<Array<{ node: string; type: string; index: number }>>>>;
}

function inspectConnections() {
  const oldPath = path.join(process.cwd(), 'working 2.json');
  const newPath = path.join(process.cwd(), 'working 2_new.json');

  if (fs.existsSync(oldPath)) {
    const oldWf: Workflow = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
    console.log('--- Original Connections around Duplicate Check ---');
    console.log('Merge Triggers:', JSON.stringify(oldWf.connections['Merge Triggers'], null, 2));
    console.log('Email Duplicate Check — PostgreSQL:', JSON.stringify(oldWf.connections['Email Duplicate Check — PostgreSQL'], null, 2));
    console.log('Email Duplicate Gate:', JSON.stringify(oldWf.connections['Email Duplicate Gate'], null, 2));
  }

  if (fs.existsSync(newPath)) {
    const newWf: Workflow = JSON.parse(fs.readFileSync(newPath, 'utf8'));
    console.log('\n--- Refactored Connections around Duplicate Check ---');
    console.log('Merge Triggers:', JSON.stringify(newWf.connections['Merge Triggers'], null, 2));
    console.log('Email Duplicate Check — PostgreSQL:', JSON.stringify(newWf.connections['Email Duplicate Check — PostgreSQL'], null, 2));
    console.log('Email Duplicate Gate:', JSON.stringify(newWf.connections['Email Duplicate Gate'], null, 2));
  }
}

inspectConnections();
