#!/usr/bin/env bun

import { runCommand } from './commands/run';
import { pluginCommand } from './commands/plugin';
import { arenaCommand } from './commands/arena';
import { battleCommand } from './commands/battle';
import { agentCommand } from './commands/agent';
import { serveCommand } from './commands/serve';

const commands: Record<string, (args: string[]) => Promise<void>> = {
  run: runCommand,
  plugin: pluginCommand,
  arena: arenaCommand,
  battle: battleCommand,
  agent: agentCommand,
  serve: serveCommand,
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === '--version' || command === '-v') {
    console.log('0.1.0');
    return;
  }

  const handler = commands[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    console.error('Run "arena --help" for usage information.');
    process.exit(1);
  }

  try {
    await handler(args.slice(1));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
🎮 AI Game Arena CLI

Usage: arena <command> [options]

Commands:
  run                         Run a battle (default: battle-tanks, aggressive vs defensive)
  plugin list                 List all installed plugins
  arena list                  List all available arenas
  battle list                 List all battles
  battle show <id>            Show battle details
  agent list                  List all agents
  serve                       Start the server

Options:
  --help, -h                  Show this help message
  --version, -v               Show version

Examples:
  arena run --arena chess --agents aggressive,defensive
  arena run --seed 42
  arena plugin list
  arena serve --port 3001
`);
}

main();
