import type {
  DomainEvent,
  EventBus,
  Logger,
  StorageAdapter,
  Subscription,
} from '@ai-game-arena/sdk';

/**
 * Scoreboard — core package.
 *
 * Tracks scores per battle and a global leaderboard, persisted through the
 * shared StorageAdapter (extended db storage). It listens to ScoreUpdated and
 * BattleFinished events, so it works for any arena/bridge without game logic.
 *
 * When a battle finishes it publishes a BattleScored event (winner + scores)
 * so dependent plugins (e.g. rewards) can connect to it. The server exposes
 * the query methods as HTTP routes.
 */

export interface ScoreEntry {
  agentId: string;
  score: number;
  winner?: boolean;
}

export interface BattleScoreboard {
  battleId: string;
  status: 'live' | 'finished';
  scores: ScoreEntry[];
  winner?: string;
  finishedAt?: number;
}

export interface LeaderboardEntry {
  agentId: string;
  battles: number;
  wins: number;
  totalScore: number;
  bestScore: number;
  updatedAt: number;
}

export interface ScoreboardOptions {
  logger: Logger;
  eventBus: EventBus;
  storage: StorageAdapter;
}

const scoreKey = (battleId: string) => `scoreboard:battle:${battleId}`;
const leaderboardKey = 'scoreboard:leaderboard';

export class Scoreboard {
  private logger: Logger;
  private eventBus: EventBus;
  private storage: StorageAdapter;
  private subscriptions: Subscription[] = [];

  constructor(options: ScoreboardOptions) {
    this.logger = options.logger;
    this.eventBus = options.eventBus;
    this.storage = options.storage;
    this.logger.info('Scoreboard initialized', { component: 'scoreboard' });

    this.subscriptions.push(
      this.eventBus.subscribe('ScoreUpdated' as never, async (event: DomainEvent) => {
        await this.handleScoreUpdated(event);
      }),
    );
    this.subscriptions.push(
      this.eventBus.subscribe('BattleFinished' as never, async (event: DomainEvent) => {
        await this.handleBattleFinished(event);
      }),
    );
  }

  async getBattleScores(battleId: string): Promise<BattleScoreboard> {
    const board = await this.storage.get<BattleScoreboard>(scoreKey(battleId));
    if (!board) {
      return { battleId, status: 'live', scores: [] };
    }
    return board;
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const leaderboard =
      (await this.storage.get<Record<string, LeaderboardEntry>>(leaderboardKey)) ?? {};
    return Object.values(leaderboard).sort((a, b) => b.totalScore - a.totalScore).slice(0, 50);
  }

  private async handleScoreUpdated(event: DomainEvent): Promise<void> {
    const battleId = event.aggregateId;
    const agentId = (event.payload as { agentId?: string }).agentId;
    const score = (event.payload as { score?: number }).score;
    if (!battleId || !agentId || typeof score !== 'number') return;

    const board = (await this.storage.get<BattleScoreboard>(scoreKey(battleId))) ?? {
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
    await this.storage.set(scoreKey(battleId), board);
  }

  private async handleBattleFinished(event: DomainEvent): Promise<void> {
    const battleId = event.aggregateId;
    if (!battleId) return;

    const payload = (event.payload ?? {}) as {
      winner?: string;
      reason?: string;
      scores?: Record<string, number>;
    };
    const payloadScores = payload.scores ?? {};

    const board: BattleScoreboard = {
      battleId,
      status: 'finished',
      scores: Object.entries(payloadScores).map(([agentId, score]) => ({
        agentId,
        score,
        winner: agentId === payload.winner,
      })),
      winner: payload.winner,
      finishedAt: Date.now(),
    };

    // Fall back to ScoreUpdated history if the payload carried no scores.
    if (board.scores.length === 0) {
      const live = await this.storage.get<BattleScoreboard>(scoreKey(battleId));
      if (live) {
        board.scores = live.scores.map((s) => ({
          ...s,
          winner: s.agentId === payload.winner,
        }));
      }
    }
    await this.storage.set(scoreKey(battleId), board);

    // Leaderboard roll-up.
    const leaderboard =
      (await this.storage.get<Record<string, LeaderboardEntry>>(leaderboardKey)) ?? {};
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
    await this.storage.set(leaderboardKey, leaderboard);

    // Announce the finalized scoreboard so dependent plugins (e.g. rewards)
    // can connect to it. Custom event types are allowed (GAME_ENGINE.md).
    await this.eventBus.publish({
      type: 'BattleScored',
      aggregateId: battleId,
      timestamp: new Date(),
      payload: {
        battleId,
        winner: board.winner ?? null,
        scores: Object.fromEntries(board.scores.map((s) => [s.agentId, s.score])),
      },
      metadata: { correlationId: battleId, version: 1 },
    } as never);
  }

  async shutdown(): Promise<void> {
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions = [];
  }
}
