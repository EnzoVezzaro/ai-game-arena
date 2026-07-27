import { ConsoleLogger, InProcessEventBus } from '@ai-game-arena/core';
import { PluginManager } from '@ai-game-arena/plugin-manager';
import { SqliteStorage } from '@ai-game-arena/storage';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { parseArgs } from '../utils/args';

export async function pluginCommand(rawArgs: string[]) {
  const args = parseArgs(rawArgs);
  const subcommand = args._[0] || 'list';

  if (subcommand === 'list') {
    await listPlugins();
  } else if (subcommand === 'create') {
    await createPlugin(args._[1]);
  } else {
    console.error(`Unknown plugin subcommand: ${subcommand}`);
    console.error('Usage: arena plugin [list|create]');
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

  const discovered = await pluginManager.discover();

  if (discovered.length === 0) {
    console.log('No plugins found.');
    return;
  }

  console.log('Installed plugins:');
  console.log('─'.repeat(60));

  for (const d of discovered) {
    console.log(`  ${d.manifest.name} (${d.manifest.id})`);
    console.log(`    Version: ${d.manifest.version}`);
    console.log(`    Category: ${d.manifest.category}`);
    if (d.manifest.description) {
      console.log(`    Description: ${d.manifest.description}`);
    }
    console.log();
  }

  console.log(`${discovered.length} plugin(s) found.`);
}

async function createPlugin(name?: string) {
  if (!name) {
    console.error('Usage: arena plugin create <plugin-name>');
    process.exit(1);
  }

  const dir = join(process.cwd(), name);
  console.log(`🛠  Scaffolding plugin "${name}" at ${dir}`);

  await mkdir(join(dir, 'src'), { recursive: true });

  const manifest = {
    id: name,
    name,
    version: '0.1.0',
    description: 'A custom AI Game Arena plugin',
    category: 'interaction',
    engines: { aga: '^0.1.0' },
    entry: './dist/index.js',
    activation: { startup: true },
    dependencies: {},
    contributions: {
      mcpTools: [],
      eventHandlers: [],
    },
  };

  const pkgJson = {
    name: `@ai-game-arena/${name}`,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      build: 'bun build src/index.ts --outdir dist --target node',
      typecheck: 'bun x tsc --noEmit',
    },
    dependencies: {
      '@ai-game-arena/sdk': 'workspace:*',
    },
    devDependencies: {
      '@types/bun': 'latest',
      typescript: '^5.7.0',
    },
  };

  const tsconfig = {
    extends: '../../tsconfig.json',
    compilerOptions: {
      outDir: './dist',
      rootDir: './src',
    },
    include: ['src/**/*'],
  };

  const entry = `import type { PluginContext } from '@ai-game-arena/sdk';

export async function activate(ctx: PluginContext): Promise<void> {
  ctx.logger.info('${name} plugin activated', { component: 'plugin:${name}' });
}

export async function deactivate(): Promise<void> {}
`;

  await writeFile(join(dir, 'arena-plugin.json'), JSON.stringify(manifest, null, 2));
  await writeFile(join(dir, 'package.json'), JSON.stringify(pkgJson, null, 2));
  await writeFile(join(dir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
  await writeFile(join(dir, 'src', 'index.ts'), entry);

  console.log(`\n✅ Plugin scaffolded. Next steps:`);
  console.log(`  cd ${name}`);
  console.log(`  bun install`);
  console.log(`  bun run build`);
}
