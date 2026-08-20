import { Hono } from 'hono';
import { Container } from '@ai-game-arena/kernel';
/**
 * "Create a Game" — a ChatGPT-style section that drives an LLM agent which
 * generates a workable single-file HTML5 game. The result can be installed
 * into `games/<slug>/` (becomes runnable via the existing HTML bridge) and
 * published to the marketplace (existing /artifacts/:id/publish route).
 *
 * Two endpoints:
 *   POST /chat          — streaming chat completion (SSE-style chunked text)
 *   POST /save          — persist the generated HTML as a new game artifact
 */
export interface GameGenMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export interface GameGenProvider {
    type: string;
    baseUrl: string;
    apiKey?: string;
    model: string;
}
export declare function createGameGeneratorRoutes(container: Container, projectRoot: string): Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/">;
//# sourceMappingURL=game-generator.d.ts.map