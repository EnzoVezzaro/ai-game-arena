import type { PluginContext } from '@ai-game-arena/sdk';

interface BattleExport {
  id: string;
  arenaId: string;
  agents: Array<{ id: string; name: string }>;
  state: {
    phase: string;
    currentTurn: number;
    scores: Record<string, number>;
  };
  events: Array<{ type: string; timestamp: number; payload: unknown }>;
  exportedAt: Date;
}

export async function activate(ctx: PluginContext): Promise<void> {
  ctx.logger.info('Export plugin activated', { component: 'plugin-export' });

  ctx.registerMcpTool({
    name: 'export_battle',
    description: 'Export battle data to JSON',
    parameters: {
      battleId: { type: 'string', description: 'Battle ID to export' },
    },
  });
}

export async function deactivate(_ctx: PluginContext): Promise<void> {
  // Cleanup
}

export function exportBattleJson(
  battle: {
    id: string;
    arenaId: string;
    agents: Array<{ id: string; name: string }>;
    state: { phase: string; currentTurn: number; scores: Record<string, number> };
  },
  events: Array<{ type: string; timestamp: number; payload: unknown }>,
): string {
  const exportData: BattleExport = {
    id: battle.id,
    arenaId: battle.arenaId,
    agents: battle.agents,
    state: battle.state,
    events,
    exportedAt: new Date(),
  };

  return JSON.stringify(exportData, null, 2);
}

export function exportBattleCsv(battle: {
  id: string;
  state: { scores: Record<string, number> };
}): string {
  const header = 'Agent,Score';
  const rows = Object.entries(battle.state.scores).map(([agent, score]) => `${agent},${score}`);
  return [header, ...rows].join('\n');
}
