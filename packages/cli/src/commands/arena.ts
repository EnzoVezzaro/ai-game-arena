import { ConsoleLogger, InProcessEventBus } from '@ai-game-arena/core';
import { PluginManager } from '@ai-game-arena/plugin-manager';
import { SqliteStorage } from '@ai-game-arena/storage';
import { parseArgs } from '../utils/args';

export async function arenaCommand(rawArgs: string[]) {
  const args = parseArgs(rawArgs);
  const subcommand = args._[0] || 'list';

  if (subcommand === 'list') {
    await listArenas();
  } else {
    console.error(`Unknown arena subcommand: ${subcommand}`);
    console.error('Usage: arena arena list');
    process.exit(1);
  }
}

async function listArenas() {
  const logger = new ConsoleLogger('warn', { component: 'cli' });
  const eventBus = new InProcessEventBus();
  const storage = new SqliteStorage(':memory:');

  const pluginManager = new PluginManager({
    pluginDirs: ['./plugins', '../games'],
    logger,
    eventBus,
    storage,
  });

  console.log('🎮 Discovering arenas...\n');

  const manifests = await pluginManager.discover();
  const arenas = manifests.filter(
    (m) => m.contributions?.arenas && m.contributions.arenas.length > 0,
  );

  if (arenas.length === 0) {
    console.log('No arenas found.');
    return;
  }

  console.log('Available arenas:');
  console.log('─'.repeat(60));

  for (const manifest of arenas) {
    console.log(`  ${manifest.name} (${manifest.id})`);
    console.log(`    Version: ${manifest.version}`);
    console.log();
  }

  console.log(`${arenas.length} arena(s) found.`);
}
