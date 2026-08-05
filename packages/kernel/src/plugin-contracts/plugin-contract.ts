import { z } from 'zod';

export type PluginCategory =
  | 'arena'
  | 'interaction'
  | 'exporter'
  | 'agent'
  | 'visualization'
  | 'metric'
  | 'storage'
  | 'controller';

export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: PluginCategory;
  readonly author?: string;
  readonly license?: string;
  readonly engines: { readonly aga: string };
  readonly entry: string;
  readonly activation: {
    readonly startup: boolean;
    readonly events?: string[];
  };
  readonly contributions: {
    readonly mcpTools?: string[];
    readonly eventHandlers?: string[];
    readonly uiPanels?: unknown[];
    readonly serverRoutes?: string[];
    readonly cliCommands?: string[];
    readonly storage?: string[];
    readonly dashboardWidgets?: unknown[];
    readonly navigationItems?: unknown[];
    readonly contextMenus?: Record<string, unknown[]>;
    readonly arenas?: string[];
  };
  readonly dependencies: Record<string, string>;
  readonly permissions: string[];
}

export const PluginManifestSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1),
  description: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  category: z.enum([
    'arena',
    'interaction',
    'exporter',
    'agent',
    'visualization',
    'metric',
    'storage',
    'controller',
  ]),
  author: z.string().optional(),
  license: z.string().optional(),
  engines: z.object({ aga: z.string() }),
  entry: z.string(),
  activation: z
    .object({
      startup: z.boolean().default(false),
      events: z.array(z.string()).optional(),
    })
    .default({ startup: false }),
  contributions: z
    .object({
      mcpTools: z.array(z.string()).optional(),
      eventHandlers: z.array(z.string()).optional(),
      uiPanels: z.array(z.unknown()).optional(),
      serverRoutes: z.array(z.string()).optional(),
      cliCommands: z.array(z.string()).optional(),
      storage: z.array(z.string()).optional(),
      dashboardWidgets: z.array(z.unknown()).optional(),
      navigationItems: z.array(z.unknown()).optional(),
      contextMenus: z.record(z.array(z.unknown())).optional(),
      arenas: z.array(z.string()).optional(),
    })
    .default({}),
  dependencies: z.record(z.string()).default({}),
  permissions: z.array(z.string()).default([]),
});

export type PluginManifestInput = z.input<typeof PluginManifestSchema>;
export type PluginManifestOutput = z.output<typeof PluginManifestSchema>;
