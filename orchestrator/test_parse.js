import { parseInstructionToDAG } from './src/llm.js';
import { PREDEFINED_WORKFLOWS } from './src/workflows.js';

async function run() {
  for (const wf of PREDEFINED_WORKFLOWS) {
    if (wf.id === 'react-project' || wf.id === 'fastapi-backend') {
      console.log('Testing:', wf.id);
      const res = await parseInstructionToDAG(wf.prompt);
      console.log('  Tasks:', res.tasks.length);
      res.tasks.forEach(t => console.log('   ', t.tool, t.name));
    }
  }
}
run().catch(console.error);
