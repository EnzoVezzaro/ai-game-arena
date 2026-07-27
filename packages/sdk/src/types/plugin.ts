import type { Logger } from './logging';
import type { ConfigReader } from './config';
import type { EventBus } from './events';
import type { ArenaPlugin } from './arena';

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
  readonly activation: ActivationConfig;
  readonly contributions: Contributions;
  readonly dependencies: Record<string, string>;
  readonly permissions: string[];
}

export interface ActivationConfig {
  readonly startup: boolean;
  readonly events?: string[];
}

export interface Contributions {
  readonly mcpTools?: string[];
  readonly eventHandlers?: string[];
  readonly uiPanels?: UiPanelContribution[];
  readonly serverRoutes?: string[];
  readonly cliCommands?: string[];
  readonly storage?: string[];
  readonly dashboardWidgets?: DashboardWidget[];
  readonly navigationItems?: NavigationItem[];
  readonly contextMenus?: Record<string, ContextMenuItem[]>;
  readonly arenas?: string[];
}

export interface PluginContext {
  readonly manifest: PluginManifest;
  readonly logger: Logger;
  readonly config: ConfigReader;
  readonly storage: PluginStorage;
  readonly eventBus: EventBus;

  registerMcpTool(tool: McpTool): void;
  registerEventHandler(handler: EventHook): void;
  registerUiPanel(panel: UiPanelContribution): void;
  registerServerRoute(route: ServerRoute): void;
  registerCliCommand(command: CliCommand): void;
  registerDashboardWidget(widget: DashboardWidget): void;
  registerNavigationItem(item: NavigationItem): void;

  getAvailableTools(): McpTool[];
  getAvailableArenas(): ArenaPlugin[];
}

export interface McpTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
}

export interface EventHook {
  readonly eventTypes: string[];
  readonly handler: (event: unknown) => Promise<void>;
}

export interface ServerRoute {
  readonly path: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly handler: (request: unknown) => Promise<unknown>;
}

export interface CliCommand {
  readonly name: string;
  readonly description: string;
  readonly handler: (args: string[], flags: Record<string, unknown>) => Promise<void>;
}

export interface UiPanelContribution {
  readonly id: string;
  readonly component: string;
  readonly label: string;
  readonly position: 'center' | 'left' | 'right' | 'bottom' | 'header' | 'footer' | 'overlay';
  readonly type:
    | 'panel'
    | 'sidebar'
    | 'event-log'
    | 'chat'
    | 'scoreboard'
    | 'header'
    | 'footer'
    | 'overlay'
    | 'custom';
}

export interface DashboardWidget {
  readonly id: string;
  readonly component: string;
  readonly label: string;
}

export interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly icon?: string;
}

export interface ContextMenuItem {
  readonly command: string;
  readonly label: string;
}

export interface PluginStorage {
  readonly namespace: string;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Subscription {
  readonly id: string;
  unsubscribe(): void;
}
