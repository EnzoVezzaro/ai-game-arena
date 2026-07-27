import { parseArgs } from '../utils/args';

export async function agentCommand(rawArgs: string[]) {
  const args = parseArgs(rawArgs);
  const subcommand = args._[0] || 'list';

  if (subcommand === 'list') {
    await listAgents();
  } else {
    console.error(`Unknown agent subcommand: ${subcommand}`);
    console.error('Usage: arena agent list');
    process.exit(1);
  }
}

async function listAgents() {
  console.log('Available agent strategies:');
  console.log('─'.repeat(60));
  console.log('  aggressive    - Plays aggressively, attacks when possible');
  console.log('  defensive     - Plays defensively, prioritizes survival');
  console.log('  llm           - Uses LLM for decision making');
  console.log('  random        - Makes random decisions');
  console.log();
  console.log('Custom agents can be created via the API or by implementing AgentRuntime.');
}
