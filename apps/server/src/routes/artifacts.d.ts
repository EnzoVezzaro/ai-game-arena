import { Hono } from 'hono';
import { Container } from '@ai-game-arena/kernel';
export type ArtifactType = 'plugin' | 'game' | 'arena';
export type ArtifactStatus = 'uploaded' | 'installed' | 'enabled' | 'disabled';
/**
 * Extracts a zip and reads the manifest (`plugin.json` for plugins,
 * `game.json` for games, `arena.json` for arenas, or `manifest.json` as fallback).
 * Returns parsed manifest + on-disk slug resolved from directory structure inside the zip
 * (top-level folder name, or manifest.id if single-file).
 */
export declare function createArtifactRoutes(container: Container, projectRoot: string): Hono<import("hono/types").BlankEnv, import("hono/types").BlankSchema, "/">;
//# sourceMappingURL=artifacts.d.ts.map