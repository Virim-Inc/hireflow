import * as fs from 'fs';
import * as path from 'path';
function readTranscript() {
    const logDir = path.join('C:', 'Users', 'Trainee', '.gemini', 'antigravity-ide', 'brain', '99577c78-4abc-40c2-8413-1a698053a3f0', '.system_generated', 'logs');
    const filePath = path.join(logDir, 'transcript_full.jsonl');
    if (!fs.existsSync(filePath)) {
        console.error('Transcript file does not exist at:', filePath);
        return;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    console.log('Total steps in transcript:', lines.length);
    // Let's find the last user input step
    for (let i = lines.length - 1; i >= 0; i--) {
        try {
            const step = JSON.parse(lines[i]);
            if (step.type === 'USER_INPUT') {
                console.log('Found USER_INPUT at step:', i);
                // Print the length of user input text and write it to a scratch file
                const userText = step.content;
                console.log('Length of user input text:', userText.length);
                fs.writeFileSync(path.join(process.cwd(), 'server', 'scratch', 'extracted_user_input.txt'), userText, 'utf8');
                console.log('Wrote full user input to server/scratch/extracted_user_input.txt');
                break;
            }
        }
        catch (e) {
            console.error('Error parsing line:', i, e);
        }
    }
}
readTranscript();
//# sourceMappingURL=get_untruncated_message.js.map