import { Hono } from 'hono';
import { Container } from '@ai-game-arena/core';
import type { Scoreboard } from '@ai-game-arena/scoreboard';

/**
 * Core scoreboard routes backed by the @ai-game-arena/scoreboard package.
 *
 *   GET /battles/:battleId  → scores for a battle
 *   GET /leaderboard        → top players by total score
 *
 * (Mounted by the server at /api/v1/scoreboard and /api/scoreboard.)
 */
export function createScoreboardRoutes(container: Container) {
  const app = new Hono();
  const scoreboard = container.resolve<Scoreboard>('scoreboard');

  app.get('/battles/:battleId', async (c) => {
    const battleId = c.req.param('battleId');
    return c.json(await scoreboard.getBattleScores(battleId));
  });

  app.get('/leaderboard', async (c) => {
    return c.json(await scoreboard.getLeaderboard());
  });

  return app;
}
