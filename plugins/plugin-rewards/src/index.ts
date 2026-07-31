import type { PluginContext, ServerRoute } from '@ai-game-arena/sdk';

/**
 * Rewards plugin — awards achievements and extends the Scoreboard plugin.
 *
 * The scoreboard plugin owns all score/leaderboard logic (it tracks battles,
 * wins, totalScore and a leaderboard in its own namespaced storage). This
 * plugin deliberately does NOT duplicate that: it connects to the scoreboard
 * through its `BattleScored` event, and only adds achievements on top.
 *
 * Dependencies (manifest): requires plugin-scoreboard — to install rewards you
 * must have the scoreboard. The scoreboard works standalone and never depends
 * on rewards.
 *
 * Server routes:
 *   GET /api/rewards/agents/:agentId  → achievements for an agent
 *   GET /api/rewards/leaderboard      → scoreboard leaderboard extended with
 *                                       each agent's achievements
 */

interface BattleScoredEvent {
  aggregateId?: string;
  payload?: {
    battleId?: string;
    winner?: string | null;
    scores?: Record<string, number>;
  };
}

interface AgentAchievements {
  agentId: string;
  achievements: Record<string, number>;
  updatedAt: number;
}

interface ScoreboardRow {
  agentId: string;
  battles: number;
  wins: number;
  totalScore: number;
  bestScore: number;
  updatedAt?: number;
}

const achievementsKey = (agentId: string) => `achievements:${agentId}`;

export async function activate(ctx: PluginContext): Promise<void> {
  ctx.logger.info('Rewards plugin activated (depends on plugin-scoreboard)', {
    component: 'plugin-rewards',
  });

  ctx.registerMcpTool({
    name: 'get_rewards',
    description: 'Get the achievements awarded to an agent',
    parameters: {
      agentId: { type: 'string', description: 'Agent ID' },
    },
  });

  // Connect to the scoreboard plugin: it publishes BattleScored after it
  // finalizes a battle. Rewards turns that data into achievements.
  ctx.registerEventHandler({
    eventTypes: ['BattleScored'],
    handler: async (event: unknown) => {
      const e = event as BattleScoredEvent;
      const battleId = e.aggregateId ?? e.payload?.battleId;
      const scores = e.payload?.scores ?? {};
      if (!battleId || Object.keys(scores).length === 0) return;

      const winner = e.payload?.winner ?? topScorer(scores);

      for (const [agentId, score] of Object.entries(scores)) {
        const rec = (await ctx.storage.get<AgentAchievements>(achievementsKey(agentId))) ?? {
          agentId,
          achievements: {},
          updatedAt: 0,
        };

        award(rec, 'battle-played');
        if (agentId === winner) award(rec, 'victory');
        if (isTopScore(scores, agentId)) award(rec, 'top-scorer');
        if (score >= 50) award(rec, 'scored-50');
        if (score >= 100) award(rec, 'century');

        rec.updatedAt = Date.now();
        await ctx.storage.set(achievementsKey(agentId), rec);
      }
    },
  });

  const routes: ServerRoute[] = [
    {
      method: 'GET',
      path: '/api/rewards/agents/:agentId',
      async handler(req) {
        const r = req as { param: (name: string) => string | undefined };
        const agentId = r.param('agentId')!;
        const rec = await ctx.storage.get<AgentAchievements>(achievementsKey(agentId));
        return rec ?? { agentId, achievements: {}, updatedAt: 0 };
      },
    },
    {
      method: 'GET',
      path: '/api/rewards/leaderboard',
      async handler(req) {
        const r = req as { url?: string };

        // Extend the scoreboard's leaderboard with achievements. We talk to
        // the scoreboard plugin through its own server route (its storage is
        // namespaced and not directly reachable). Derive the origin from the
        // incoming request so this works in any deployment topology.
        let rows: ScoreboardRow[] = [];
        try {
          const origin = r.url ? new URL(r.url).origin : '';
          if (origin) {
            const res = await fetch(`${origin}/api/scoreboard/leaderboard`);
            if (res.ok) {
              rows = (await res.json()) as ScoreboardRow[];
            }
          }
        } catch {
          // Scoreboard unreachable — fall back to achievements-only rows.
        }

        const extended: Array<ScoreboardRow & { achievements: Record<string, number> }> = [];
        for (const row of rows) {
          const rec = await ctx.storage.get<AgentAchievements>(achievementsKey(row.agentId));
          extended.push({ ...row, achievements: rec?.achievements ?? {} });
        }

        return extended;
      },
    },
  ];

  for (const route of routes) ctx.registerServerRoute(route);
}

export async function deactivate(_ctx: PluginContext): Promise<void> {
  // Storage is namespaced; achievements stay intact.
}

function award(rec: AgentAchievements, name: string): void {
  rec.achievements[name] = (rec.achievements[name] ?? 0) + 1;
}

function topScorer(scores: Record<string, number>): string | undefined {
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0];
}

function isTopScore(scores: Record<string, number>, agentId: string): boolean {
  const top = topScorer(scores);
  return top !== undefined && scores[agentId] === scores[top];
}
