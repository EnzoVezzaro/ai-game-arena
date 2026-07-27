import { z } from 'zod';

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
  engines: z.object({
    aga: z.string(),
  }),
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
      uiPanels: z
        .array(
          z.object({
            id: z.string(),
            component: z.string(),
            label: z.string(),
            position: z.enum(['center', 'left', 'right', 'bottom', 'header', 'footer', 'overlay']),
            type: z.enum([
              'panel',
              'sidebar',
              'event-log',
              'chat',
              'scoreboard',
              'header',
              'footer',
              'overlay',
              'custom',
            ]),
          }),
        )
        .optional(),
      serverRoutes: z.array(z.string()).optional(),
      cliCommands: z.array(z.string()).optional(),
      storage: z.array(z.string()).optional(),
      dashboardWidgets: z
        .array(
          z.object({
            id: z.string(),
            component: z.string(),
            label: z.string(),
          }),
        )
        .optional(),
      navigationItems: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            path: z.string(),
            icon: z.string().optional(),
          }),
        )
        .optional(),
      contextMenus: z
        .record(
          z.array(
            z.object({
              command: z.string(),
              label: z.string(),
            }),
          ),
        )
        .optional(),
      arenas: z.array(z.string()).optional(),
    })
    .default({}),
  dependencies: z.record(z.string()).default({}),
  permissions: z.array(z.string()).default([]),
});

export type PluginManifestInput = z.input<typeof PluginManifestSchema>;
export type PluginManifestOutput = z.output<typeof PluginManifestSchema>;
