import type { PluginContext, ServerRoute } from '@ai-game-arena/sdk';

/**
 * Scoreboard plugin — independent, with extended db storage.
 *
 * It listens to score events and persists per-battle scores + a leaderboard in
 * its own namespaced storage (extending the db core, like the polls plugin).
 * The system's web Scoreboard panel reads from this plugin's routes.
 *
 * Server routes (mounted by the server via plugin-contributed routes):
 *   GET /api/scoreboard/battles/:battleId  → scores for a battle
 *   GET /api/scoreboard/leaderboard        → top players by total score
 */

interface ScoreEntry {
  agentId: string;
  score: number;
  winner?: boolean;
}

interface BattleScoreboard {
  battleId: string;
  status: 'live' | 'finished';
  scores: ScoreEntry[];
  winner?: string;
  finishedAt?: number;
}

interface LeaderboardEntry {
  agentId: string;
  battles: number;
  wins: number;
  totalScore: number;
  bestScore: number;
  updatedAt: number;
}

const scoreKey = (battleId: string) => `score:${battleId}`;
const leaderboardKey = 'leaderboard';

export async function activate(ctx: PluginContext): Promise<void> {
  ctx.logger.info('Scoreboard plugin activated', { component: 'plugin-scoreboard' });

  // Track live scores as they change.
  ctx.registerEventHandler({
    eventTypes: ['ScoreUpdated'],
    handler: async (event) => {
      const e = event as {
        aggregateId?: string;
        payload?: { agentId?: string; score?: number };
      };
      const battleId = e.aggregateId;
      const agentId = e.payload?.agentId;
      const score = e.payload?.score;
      if (!battleId || !agentId || typeof score !== 'number') return;

      const board = (await ctx.storage.get<BattleScoreboard>(scoreKey(battleId))) ?? {
        battleId,
        status: 'live' as const,
        scores: [],
      };
      const existing = board.scores.find((s) => s.agentId === agentId);
      if (existing) {
        existing.score = score;
      } else {
        board.scores.push({ agentId, score });
      }
      await ctx.storage.set(scoreKey(battleId), board);
    },
  });

  // Finalize on battle end: mark finished, record the winner, and roll the
  // scores into the leaderboard.
  ctx.registerEventHandler({
    eventTypes: ['BattleFinished'],
    handler: async (event) => {
      const e = event as {
        aggregateId?: string;
        payload?: {
          winner?: string;
          reason?: string;
          scores?: Record<string, number>;
        };
      };
      const battleId = e.aggregateId;
      if (!battleId) return;

      const payloadScores = e.payload?.scores ?? {};
      const board: BattleScoreboard = {
        battleId,
        status: 'finished',
        scores: Object.entries(payloadScores).map(([agentId, score]) => ({
          agentId,
          score,
          winner: agentId === e.payload?.winner,
        })),
        winner: e.payload?.winner,
        finishedAt: Date.now(),
      };

      // Fall back to ScoreUpdated history if the payload carried no scores.
      if (board.scores.length === 0) {
        const live = await ctx.storage.get<BattleScoreboard>(scoreKey(battleId));
        if (live) {
          board.scores = live.scores.map((s) => ({
            ...s,
            winner: s.agentId === e.payload?.winner,
          }));
        }
      }
      await ctx.storage.set(scoreKey(battleId), board);

      // Leaderboard roll-up (extended db storage: keyed under the plugin ns).
      const leaderboard =
        (await ctx.storage.get<Record<string, LeaderboardEntry>>(leaderboardKey)) ?? {};
      for (const entry of board.scores) {
        const row = leaderboard[entry.agentId] ?? {
          agentId: entry.agentId,
          battles: 0,
          wins: 0,
          totalScore: 0,
          bestScore: 0,
          updatedAt: 0,
        };
        row.battles += 1;
        row.totalScore += entry.score;
        row.bestScore = Math.max(row.bestScore, entry.score);
        if (entry.winner) row.wins += 1;
        row.updatedAt = board.finishedAt ?? Date.now();
        leaderboard[entry.agentId] = row;
      }
      await ctx.storage.set(leaderboardKey, leaderboard);
    },
  });

  const routes: ServerRoute[] = [
    {
      method: 'GET',
      path: '/api/scoreboard/battles/:battleId',
      async handler(req) {
        const r = req as { param: (name: string) => string | undefined };
        const battleId = r.param('battleId')!;
        const board = await ctx.storage.get<BattleScoreboard>(scoreKey(battleId));
        if (!board) {
          return {
            battleId,
            status: 'live',
            scores: [],
          };
        }
        return board;
      },
    },
    {
      method: 'GET',
      path: '/api/scoreboard/leaderboard',
      async handler() {
        const leaderboard =
          (await ctx.storage.get<Record<string, LeaderboardEntry>>(leaderboardKey)) ?? {};
        return Object.values(leaderboard)
          .sort((a, b) => b.totalScore - a.totalScore)
          .slice(0, 50);
      },
    },
  ];

  for (const route of routes) ctx.registerServerRoute(route);
}

export async function deactivate(_ctx: PluginContext): Promise<void> {
  // Storage is namespaced; historical scores stay intact.
}
