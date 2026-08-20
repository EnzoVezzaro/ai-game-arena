import { readdir, readFile, stat, access } from 'fs/promises';
import { join, resolve } from 'path';
import { PluginManifestSchema } from '@ai-game-arena/sdk';
import type {
  PluginManifest,
  PluginContext,
  Logger,
  EventBus,
  Subscription,
} from '@ai-game-arena/sdk';
import type { StorageAdapter } from '@ai-game-arena/sdk';

export interface PluginInstance {
  manifest: PluginManifest;
  context: PluginContext;
  module: unknown;
  activatedAt?: Date;
  subscriptions: Subscription[];
  basePath: string;
}

export interface PluginManagerOptions {
  pluginDirs: string[];
  logger: Logger;
  eventBus: EventBus;
  storage: StorageAdapter;
}

export interface RegisteredServerRoute {
  pluginId: string;
  method: string;
  path: string;
  handler: unknown;
}

export interface RegisteredCliCommand {
  pluginId: string;
  name: string;
  description: string;
  handler: unknown;
}

export interface RegisteredServerMiddleware {
  pluginId: string;
  name: string;
  priority: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handle(context: any, next: () => Promise<void>): Promise<void>;
}

export class PluginManager {
  private plugins = new Map<string, PluginInstance>();
  private hooks = new Map<
    string,
    Array<{ eventTypes: string[]; handler: (event: unknown) => Promise<void> }>
  >();
  private logger: Logger;
  private eventBus: EventBus;
  private storage: StorageAdapter;
  private pluginDirs: string[];
  private serverRoutes: RegisteredServerRoute[] = [];
  private cliCommands: RegisteredCliCommand[] = [];
  private serverMiddlewares: RegisteredServerMiddleware[] = [];
  private gameConverters: Array<{ pluginId: string; converter: unknown }> = [];


  constructor(options: PluginManagerOptions) {
    this.logger = options.logger;
    this.eventBus = options.eventBus;
    this.storage = options.storage;
    this.pluginDirs = options.pluginDirs;
  }

  async discover(): Promise<Array<{ manifest: PluginManifest; basePath: string }>> {
    const results: Array<{ manifest: PluginManifest; basePath: string }> = [];

    for (const dir of this.pluginDirs) {
      const resolvedDir = resolve(dir);
      try {
        const entries = await readdir(resolvedDir);
        for (const entry of entries) {
          const entryPath = join(resolvedDir, entry);
          const entryStat = await stat(entryPath);
          if (!entryStat.isDirectory()) continue;

          const manifestNames = ['plugin.json', 'game.json', 'arena.json'];
          let manifestContent: string | null = null;
          let manifestUsed = '';
          for (const name of manifestNames) {
            const mp = join(entryPath, name);
            try {
              manifestContent = await readFile(mp, 'utf-8');
              manifestUsed = name;
              break;
            } catch {
              // try next name
            }
          }
          if (!manifestContent) continue;

          try {
            const raw = JSON.parse(manifestContent);
            const result = PluginManifestSchema.safeParse(raw);

            if (result.success) {
              results.push({ manifest: result.data, basePath: entryPath });
              this.logger.info(`Discovered ${manifestUsed}: ${result.data.id}`, {
                component: 'plugin-manager',
              });
            } else {
              this.logger.warn(
                `Invalid manifest: ${join(entryPath, manifestUsed)}`,
                { component: 'plugin-manager' },
                result.error,
              );
            }
          } catch {
            this.logger.warn(`Failed to parse manifest in ${entryPath}`, {
              component: 'plugin-manager',
            });
          }
        }
      } catch (error) {
        this.logger.warn(
          `Cannot read plugin directory: ${dir}`,
          { component: 'plugin-manager' },
          error as Error,
        );
      }
    }

    return results;
  }

  async load(manifest: PluginManifest, basePath: string): Promise<void> {
    if (this.plugins.has(manifest.id)) {
      this.logger.warn(`Plugin already loaded: ${manifest.id}`, { component: 'plugin-manager' });
      return;
    }

    // Resolve dependencies
    for (const [depId] of Object.entries(manifest.dependencies)) {
      if (!this.plugins.has(depId)) {
        throw new Error(`Plugin "${manifest.id}" depends on "${depId}" which is not loaded`);
      }
    }

    const distEntryPath = join(basePath, manifest.entry);
    const srcEntryPath = join(basePath, 'src', 'index.ts');
    let entryPath = distEntryPath;
    try {
      await access(distEntryPath);
    } catch {
      try {
        await access(srcEntryPath);
        entryPath = srcEntryPath;
      } catch {
        throw new Error(
          `Plugin "${manifest.id}" entry not found: tried ${distEntryPath} and ${srcEntryPath}`,
        );
      }
    }
    const module = await import(entryPath);

    const context = this.createContext(manifest);

    this.plugins.set(manifest.id, {
      manifest,
      context,
      module: module.default ?? module,
      subscriptions: [],
      basePath,
    });

    this.logger.info(`Loaded plugin: ${manifest.id}`, { component: 'plugin-manager' });
  }

  async activateAll(): Promise<void> {
    // Activate startup plugins first
    for (const [id, plugin] of this.plugins) {
      if (plugin.manifest.activation.startup) {
        await this.activate(id);
      }
    }
  }

  async activate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }
    if (plugin.activatedAt) {
      return; // Already activated
    }

    const activateFn = (plugin.module as { activate?: (ctx: PluginContext) => Promise<void> })
      .activate;
    if (activateFn) {
      await activateFn(plugin.context);
    }

    plugin.activatedAt = new Date();
    this.logger.info(`Activated plugin: ${pluginId}`, { component: 'plugin-manager' });
  }

  async deactivate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.activatedAt) return;

    const deactivateFn = (plugin.module as { deactivate?: (ctx: PluginContext) => Promise<void> })
      .deactivate;
    if (deactivateFn) {
      await deactivateFn(plugin.context);
    }

    for (const subscription of plugin.subscriptions) {
      try {
        subscription.unsubscribe();
      } catch {
        // already removed
      }
    }
    plugin.subscriptions = [];

    plugin.activatedAt = undefined;
    this.logger.info(`Deactivated plugin: ${pluginId}`, { component: 'plugin-manager' });
  }

  async loadAll(): Promise<void> {
    const discovered = await this.discover();

    // Simple topological sort by dependencies
    const sorted = this.topologicalSort(discovered.map((d) => d.manifest));
    const manifestToBase = new Map(discovered.map((d) => [d.manifest.id, d.basePath]));

    for (const manifest of sorted) {
      const basePath = manifestToBase.get(manifest.id) ?? join(this.pluginDirs[0]!, manifest.id);

      try {
        await this.load(manifest, basePath);
      } catch (error) {
        this.logger.error(
          `Failed to load plugin: ${manifest.id}`,
          { component: 'plugin-manager' },
          error as Error,
        );
      }
    }

    await this.activateAll();
  }

  getPlugin(id: string): PluginInstance | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  getActivePlugins(): PluginInstance[] {
    return this.getAllPlugins().filter((p) => p.activatedAt !== undefined);
  }

  getRegisteredServerRoutes(): RegisteredServerRoute[] {
    return [...this.serverRoutes];
  }

  getRegisteredCliCommands(): RegisteredCliCommand[] {
    return [...this.cliCommands];
  }

  getRegisteredServerMiddlewares(): RegisteredServerMiddleware[] {
    return [...this.serverMiddlewares].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  }

  async shutdown(): Promise<void> {
    // Deactivate all plugins in reverse order
    const active = this.getActivePlugins().reverse();
    for (const plugin of active) {
      await this.deactivate(plugin.manifest.id);
    }
    this.plugins.clear();
    this.hooks.clear();
  }

  private createContext(manifest: PluginManifest): PluginContext {
    const registeredTools: Array<{
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }> = [];
    const registeredHandlers: Array<{
      eventTypes: string[];
      handler: (event: unknown) => Promise<void>;
    }> = [];
    const registeredUiPanels: Array<{
      id: string;
      component: string;
      label: string;
      position: string;
      type: string;
    }> = [];

    const registeredRoutes: Array<{ method: string; path: string; handler: unknown }> = [];
    const registeredCliCommands: Array<{ name: string; description: string; handler: unknown }> =
      [];
    const registeredWidgets: Array<{ id: string; component: string; label: string }> = [];
    const registeredNavItems: Array<{ id: string; label: string; path: string }> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const registeredMiddlewares: Array<{
      name: string;
      priority?: number;
      handle(context: any, next: () => Promise<void>): Promise<void>;
    }> = [];

    const self = this;

    return {
      manifest,
      logger: this.logger.child({ component: `plugin:${manifest.id}` }),
      config: {
        get: (_key: string) => undefined,
        getOrThrow: (key: string) => {
          throw new Error(`Config key "${key}" not found`);
        },
        has: () => false,
        getAll: () => ({}),
      },
      storage: {
        namespace: manifest.id,
        async get<T>(key: string) {
          return self.storage.get<T>(`plugins:${manifest.id}:${key}`);
        },
        async set<T>(key: string, value: T) {
          return self.storage.set(`plugins:${manifest.id}:${key}`, value);
        },
        async delete(key: string) {
          return self.storage.delete(`plugins:${manifest.id}:${key}`);
        },
      },
      eventBus: this.eventBus,
      registerMcpTool(tool) {
        registeredTools.push(tool);
      },
      registerEventHandler(hook) {
        registeredHandlers.push(hook);
        // Wire up to event bus and track subscriptions
        for (const eventType of hook.eventTypes) {
          const subscription = self.eventBus.subscribe(eventType as never, hook.handler as never);
          const plugin = self.plugins.get(manifest.id);
          if (plugin) {
            plugin.subscriptions.push(subscription);
          }
        }
      },
      registerUiPanel(panel) {
        registeredUiPanels.push(panel);
      },
      registerServerRoute(route) {
        registeredRoutes.push({
          method: String(route.method),
          path: route.path,
          handler: route.handler,
        });
        self.serverRoutes.push({
          pluginId: manifest.id,
          method: route.method,
          path: route.path,
          handler: route.handler,
        });
      },
      registerCliCommand(command) {
        registeredCliCommands.push({
          name: command.name,
          description: command.description,
          handler: command.handler,
        });
        self.cliCommands.push({
          pluginId: manifest.id,
          name: command.name,
          description: command.description,
          handler: command.handler,
        });
      },
      registerDashboardWidget(widget) {
        registeredWidgets.push({ id: widget.id, component: widget.component, label: widget.label });
      },
      registerNavigationItem(item) {
        registeredNavItems.push({ id: item.id, label: item.label, path: item.path });
      },
      registerServerMiddleware(middleware) {
        registeredMiddlewares.push(middleware);
        self.serverMiddlewares.push({
          pluginId: manifest.id,
          name: middleware.name,
          priority: middleware.priority ?? 100,
          handle: middleware.handle,
        });
      },
      registerGameConverter(converter) {
        self.gameConverters.push({ pluginId: manifest.id, converter });
      },

      getAvailableTools() {
        return registeredTools;
      },
      getAvailableArenas() {
        return [];
      },
    };
  }

  private topologicalSort(manifests: PluginManifest[]): PluginManifest[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: PluginManifest[] = [];
    const manifestMap = new Map(manifests.map((m) => [m.id, m]));

    const visit = (id: string) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`Dependency cycle detected involving plugin "${id}"`);
      }
      visiting.add(id);

      const manifest = manifestMap.get(id);
      if (!manifest) {
        visiting.delete(id);
        visited.add(id);
        return;
      }

      for (const depId of Object.keys(manifest.dependencies)) {
        visit(depId);
      }

      visiting.delete(id);
      visited.add(id);
      result.push(manifest);
    };

    for (const manifest of manifests) {
      visit(manifest.id);
    }

    return result;
  }
}
