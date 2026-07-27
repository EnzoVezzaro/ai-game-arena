import { ConsoleLogger, InProcessEventBus } from '@ai-game-arena/core';
import { Runtime } from '@ai-game-arena/runtime';
import { SqliteStorage } from '@ai-game-arena/storage';
import { parseArgs } from '../utils/args';

export async function battleCommand(rawArgs: string[]) {
  const args = parseArgs(rawArgs);
  const subcommand = args._[0] || 'list';
  const battleId = args._[1];

  if (subcommand === 'list') {
    await listBattles();
  } else if (subcommand === 'show') {
    if (!battleId) {
      console.error('Usage: arena battle show <battleId>');
      process.exit(1);
    }
    await showBattle(battleId);
  } else {
    console.error(`Unknown battle subcommand: ${subcommand}`);
    console.error('Usage: arena battle [list|show <id>]');
    process.exit(1);
  }
}

async function listBattles() {
  const logger = new ConsoleLogger('warn', { component: 'cli' });
  const eventBus = new InProcessEventBus();
  const storage = new SqliteStorage(':memory:');
  const runtime = new Runtime({ logger, eventBus, storage });

  const battles = runtime.getAllBattles();

  if (battles.length === 0) {
    console.log('No battles found.');
    return;
  }

  console.log('Battles:');
  console.log('─'.repeat(60));

  for (const battle of battles) {
    console.log(`  ${battle.id.slice(0, 8)}...`);
    console.log(`    Arena: ${battle.arenaId}`);
    console.log(`    Phase: ${battle.state.phase}`);
    console.log(`    Turn: ${battle.state.currentTurn}`);
    console.log(`    Created: ${battle.createdAt.toISOString()}`);
    console.log();
  }

  console.log(`${battles.length} battle(s) found.`);
}

async function showBattle(battleId: string) {
  const logger = new ConsoleLogger('warn', { component: 'cli' });
  const eventBus = new InProcessEventBus();
  const storage = new SqliteStorage(':memory:');
  const runtime = new Runtime({ logger, eventBus, storage });

  const battle = runtime.getBattle(battleId);
  if (!battle) {
    console.error(`Battle not found: ${battleId}`);
    process.exit(1);
  }

  console.log('Battle details:');
  console.log('─'.repeat(60));
  console.log(`  ID: ${battle.id}`);
  console.log(`  Arena: ${battle.arenaId}`);
  console.log(`  Phase: ${battle.state.phase}`);
  console.log(`  Turn: ${battle.state.currentTurn}`);
  console.log(`  Agents: ${battle.agents.map((a) => a.name).join(', ')}`);
  console.log(`  Scores:`, battle.state.scores);
  console.log(`  Created: ${battle.createdAt.toISOString()}`);
  if (battle.startedAt) {
    console.log(`  Started: ${battle.startedAt.toISOString()}`);
  }
  if (battle.finishedAt) {
    console.log(`  Finished: ${battle.finishedAt.toISOString()}`);
  }
}
