import { readdir, readFile, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { PluginManifestSchema } from '@ai-game-arena/sdk';
import type { PluginManifest, PluginContext, Logger, EventBus } from '@ai-game-arena/sdk';
import type { StorageAdapter } from '@ai-game-arena/sdk';

export interface PluginInstance {
  manifest: PluginManifest;
  context: PluginContext;
  module: unknown;
  activatedAt?: Date;
}

export interface PluginManagerOptions {
  pluginDirs: string[];
  logger: Logger;
  eventBus: EventBus;
  storage: StorageAdapter;
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

          const manifestPath = join(entryPath, 'arena-plugin.json');
          try {
            const manifestContent = await readFile(manifestPath, 'utf-8');
            const raw = JSON.parse(manifestContent);
            const result = PluginManifestSchema.safeParse(raw);

            if (result.success) {
              results.push({ manifest: result.data, basePath: entryPath });
              this.logger.info(`Discovered plugin: ${result.data.id}`, {
                component: 'plugin-manager',
              });
            } else {
              this.logger.warn(
                `Invalid manifest: ${manifestPath}`,
                { component: 'plugin-manager' },
                result.error,
              );
            }
          } catch {
            // No manifest file, skip
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

    const entryPath = join(basePath, manifest.entry);
    const module = await import(entryPath);

    const context = this.createContext(manifest);

    this.plugins.set(manifest.id, {
      manifest,
      context,
      module: module.default ?? module,
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
        // Wire up to event bus
        for (const eventType of hook.eventTypes) {
          self.eventBus.subscribe(eventType as never, hook.handler as never);
        }
      },
      registerUiPanel(panel) {
        registeredUiPanels.push(panel);
      },
      registerServerRoute(_route) {
        // Handled by server package
      },
      registerCliCommand(_command) {
        // Handled by CLI package
      },
      registerDashboardWidget(_widget) {
        // Handled by frontend
      },
      registerNavigationItem(_item) {
        // Handled by frontend
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
    const result: PluginManifest[] = [];
    const manifestMap = new Map(manifests.map((m) => [m.id, m]));

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const manifest = manifestMap.get(id);
      if (!manifest) return;

      for (const depId of Object.keys(manifest.dependencies)) {
        visit(depId);
      }

      result.push(manifest);
    };

    for (const manifest of manifests) {
      visit(manifest.id);
    }

    return result;
  }
}
