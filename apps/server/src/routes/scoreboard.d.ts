import { Hono } from 'hono';
import { Container } from '@ai-game-arena/kernel';
/**
 * Core scoreboard routes backed by the @ai-game-arena/scoreboard package.
 *
 *   GET /battles/:battleId  → scores for a battle
 *   GET /leaderboard        → top players by total score
 *
 * (Mounted by the server at /api/v1/scoreboard and /api/scoreboard.)
 */
export declare function createScoreboardRoutes(container: Container): Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/">;
//# sourceMappingURL=scoreboard.d.ts.map