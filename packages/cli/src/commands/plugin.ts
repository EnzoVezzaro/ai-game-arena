import { ConsoleLogger, InProcessEventBus } from '@ai-game-arena/core';
import { PluginManager } from '@ai-game-arena/plugin-manager';
import { SqliteStorage } from '@ai-game-arena/storage';
import { parseArgs } from '../utils/args';

export async function pluginCommand(rawArgs: string[]) {
  const args = parseArgs(rawArgs);
  const subcommand = args._[0] || 'list';

  if (subcommand === 'list') {
    await listPlugins();
  } else {
    console.error(`Unknown plugin subcommand: ${subcommand}`);
    console.error('Usage: arena plugin list');
    process.exit(1);
  }
}

async function listPlugins() {
  const logger = new ConsoleLogger('warn', { component: 'cli' });
  const eventBus = new InProcessEventBus();
  const storage = new SqliteStorage(':memory:');

  const pluginManager = new PluginManager({
    pluginDirs: ['./plugins', '../games', '../plugins'],
    logger,
    eventBus,
    storage,
  });

  console.log('📦 Discovering plugins...\n');

  const manifests = await pluginManager.discover();

  if (manifests.length === 0) {
    console.log('No plugins found.');
    return;
  }

  console.log('Installed plugins:');
  console.log('─'.repeat(60));

  for (const manifest of manifests) {
    console.log(`  ${manifest.name} (${manifest.id})`);
    console.log(`    Version: ${manifest.version}`);
    console.log(`    Category: ${manifest.category}`);
    if (manifest.description) {
      console.log(`    Description: ${manifest.description}`);
    }
    console.log();
  }

  console.log(`${manifests.length} plugin(s) found.`);
}
