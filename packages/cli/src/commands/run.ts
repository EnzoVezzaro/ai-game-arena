import { ConsoleLogger, InProcessEventBus } from '@ai-game-arena/core';
import { PluginManager } from '@ai-game-arena/plugin-manager';
import { Runtime } from '@ai-game-arena/runtime';
import { SqliteStorage } from '@ai-game-arena/storage';
import { parseArgs } from '../utils/args';
import type { AgentConfig } from '@ai-game-arena/sdk';

export async function runCommand(rawArgs: string[]) {
  const args = parseArgs(rawArgs);

  const arenaId = (args.arena as string) || 'battle-tanks';
  const agentNames = (args.agents as string)?.split(',') || ['aggressive', 'defensive'];
  // Allow --names to override per-agent display names (comma-separated list)
  const customDisplayNames = (args.names as string)?.split(',');
  const seed = parseInt(args.seed as string) || Math.floor(Math.random() * 1000000);
  const maxTurns = parseInt(args['max-turns'] as string) || 100;

  console.log(`🎮 Starting battle...`);
  console.log(`   Arena: ${arenaId}`);
  console.log(`   Agents: ${agentNames.join(', ')}`);
  console.log(`   Seed: ${seed}`);
  console.log(`   Max Turns: ${maxTurns}`);
  console.log();

  // Initialize core
  const logger = new ConsoleLogger('info', { component: 'cli' });
  const eventBus = new InProcessEventBus();
  const storage = new SqliteStorage(':memory:');

  // Plugin manager
  const pluginManager = new PluginManager({
    pluginDirs: ['./plugins', '../games'],
    logger,
    eventBus,
    storage,
  });

  // Runtime
  const runtime = new Runtime({ logger, eventBus, storage });

  // Load plugins
  console.log('📦 Loading plugins...');
  await pluginManager.loadAll();

  // Register arenas from plugins
  const plugins = pluginManager.getAllPlugins();
  for (const plugin of plugins) {
    const arenaIds = plugin.manifest.contributions.arenas ?? [];
    if (arenaIds.length > 0) {
      const arenaCandidate = plugin.module as
        | { default?: unknown; arena?: unknown }
        | undefined;
      const arenaExport = arenaCandidate?.default ?? arenaCandidate?.arena ?? arenaCandidate;
      if (arenaExport && typeof arenaExport === 'function') {
        const arena = new (arenaExport as new () => import('@ai-game-arena/sdk').ArenaPlugin)();
        for (const id of arenaIds) {
          runtime.registerArena(id, arena);
        }
      }
    }
  }

  // Create agents
  const agents: AgentConfig[] = agentNames.map((name, i) => ({
    id: `agent-${i + 1}`,
    name: customDisplayNames?.[i] ?? name,
    strategy: 'custom' as const,
  }));

  // Create and start battle
  console.log('⚔️  Creating battle...');
  const battle = await runtime.createBattle(arenaId, agents, { seed, maxTurns });

  console.log('🚀 Starting battle...');
  await runtime.startBattle(battle.id);

  // Print results
  const finalBattle = runtime.getBattle(battle.id);
  if (finalBattle) {
    console.log();
    console.log('🏁 Battle completed!');
    console.log(
      `   Winner: ${Object.entries(finalBattle.state.scores).sort((a, b) => b[1] - a[1])[0]?.[0] || 'draw'}`,
    );
    console.log(`   Turns: ${finalBattle.state.currentTurn}`);
    console.log(`   Scores:`, finalBattle.state.scores);
  }
}
