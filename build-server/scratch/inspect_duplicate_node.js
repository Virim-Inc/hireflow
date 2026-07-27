import * as fs from 'fs';
import * as path from 'path';
function inspectDuplicates() {
    const filePath = path.join(process.cwd(), 'working 2_new.json');
    const wf = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const dupCheck = wf.nodes.find(n => n.name.includes('Dup') || n.name.includes('check') || n.name.includes('Gate'));
    const dupNodes = wf.nodes.filter(n => n.name.toLowerCase().includes('dup') || n.name.toLowerCase().includes('gate') || n.name.toLowerCase().includes('dedup'));
    console.log('Duplicate check related nodes:');
    console.log(dupNodes.map(n => ({ name: n.name, type: n.type, position: n.position })));
    dupNodes.forEach(node => {
        console.log(`\n--- Node: ${node.name} ---`);
        console.log(JSON.stringify(node.parameters, null, 2));
    });
}
inspectDuplicates();
//# sourceMappingURL=inspect_duplicate_node.js.map