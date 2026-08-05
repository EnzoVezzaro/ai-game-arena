import { z } from 'zod';
export type PluginCategory = 'arena' | 'interaction' | 'exporter' | 'agent' | 'visualization' | 'metric' | 'storage' | 'controller';
export interface PluginManifest {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly version: string;
    readonly category: PluginCategory;
    readonly author?: string;
    readonly license?: string;
    readonly engines: {
        readonly aga: string;
    };
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
export declare const PluginManifestSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    version: z.ZodString;
    category: z.ZodEnum<["arena", "interaction", "exporter", "agent", "visualization", "metric", "storage", "controller"]>;
    author: z.ZodOptional<z.ZodString>;
    license: z.ZodOptional<z.ZodString>;
    engines: z.ZodObject<{
        aga: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        aga: string;
    }, {
        aga: string;
    }>;
    entry: z.ZodString;
    activation: z.ZodDefault<z.ZodObject<{
        startup: z.ZodDefault<z.ZodBoolean>;
        events: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        startup: boolean;
        events?: string[] | undefined;
    }, {
        events?: string[] | undefined;
        startup?: boolean | undefined;
    }>>;
    contributions: z.ZodDefault<z.ZodObject<{
        mcpTools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        eventHandlers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        uiPanels: z.ZodOptional<z.ZodArray<z.ZodUnknown, "many">>;
        serverRoutes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        cliCommands: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        storage: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        dashboardWidgets: z.ZodOptional<z.ZodArray<z.ZodUnknown, "many">>;
        navigationItems: z.ZodOptional<z.ZodArray<z.ZodUnknown, "many">>;
        contextMenus: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodUnknown, "many">>>;
        arenas: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        storage?: string[] | undefined;
        arenas?: string[] | undefined;
        mcpTools?: string[] | undefined;
        eventHandlers?: string[] | undefined;
        uiPanels?: unknown[] | undefined;
        serverRoutes?: string[] | undefined;
        cliCommands?: string[] | undefined;
        dashboardWidgets?: unknown[] | undefined;
        navigationItems?: unknown[] | undefined;
        contextMenus?: Record<string, unknown[]> | undefined;
    }, {
        storage?: string[] | undefined;
        arenas?: string[] | undefined;
        mcpTools?: string[] | undefined;
        eventHandlers?: string[] | undefined;
        uiPanels?: unknown[] | undefined;
        serverRoutes?: string[] | undefined;
        cliCommands?: string[] | undefined;
        dashboardWidgets?: unknown[] | undefined;
        navigationItems?: unknown[] | undefined;
        contextMenus?: Record<string, unknown[]> | undefined;
    }>>;
    dependencies: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    permissions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    version: string;
    description: string;
    category: "storage" | "arena" | "interaction" | "metric" | "exporter" | "agent" | "visualization" | "controller";
    activation: {
        startup: boolean;
        events?: string[] | undefined;
    };
    contributions: {
        storage?: string[] | undefined;
        arenas?: string[] | undefined;
        mcpTools?: string[] | undefined;
        eventHandlers?: string[] | undefined;
        uiPanels?: unknown[] | undefined;
        serverRoutes?: string[] | undefined;
        cliCommands?: string[] | undefined;
        dashboardWidgets?: unknown[] | undefined;
        navigationItems?: unknown[] | undefined;
        contextMenus?: Record<string, unknown[]> | undefined;
    };
    engines: {
        aga: string;
    };
    entry: string;
    dependencies: Record<string, string>;
    permissions: string[];
    author?: string | undefined;
    license?: string | undefined;
}, {
    id: string;
    name: string;
    version: string;
    description: string;
    category: "storage" | "arena" | "interaction" | "metric" | "exporter" | "agent" | "visualization" | "controller";
    engines: {
        aga: string;
    };
    entry: string;
    author?: string | undefined;
    activation?: {
        events?: string[] | undefined;
        startup?: boolean | undefined;
    } | undefined;
    contributions?: {
        storage?: string[] | undefined;
        arenas?: string[] | undefined;
        mcpTools?: string[] | undefined;
        eventHandlers?: string[] | undefined;
        uiPanels?: unknown[] | undefined;
        serverRoutes?: string[] | undefined;
        cliCommands?: string[] | undefined;
        dashboardWidgets?: unknown[] | undefined;
        navigationItems?: unknown[] | undefined;
        contextMenus?: Record<string, unknown[]> | undefined;
    } | undefined;
    license?: string | undefined;
    dependencies?: Record<string, string> | undefined;
    permissions?: string[] | undefined;
}>;
export type PluginManifestInput = z.input<typeof PluginManifestSchema>;
export type PluginManifestOutput = z.output<typeof PluginManifestSchema>;
//# sourceMappingURL=plugin-contract.d.ts.map