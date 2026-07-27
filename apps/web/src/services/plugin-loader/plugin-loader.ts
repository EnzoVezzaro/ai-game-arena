import type { ComponentType } from 'react';
import type { ComponentRegistry, ShellRegion } from '../../runtime/registry/component-registry';

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  frontend?: {
    contributions?: Array<{
      id: string;
      region: ShellRegion;
      componentPath: string;
      order?: number;
    }>;
  };
}

interface LoadedPlugin {
  manifest: PluginManifest;
  contributions: Array<{ id: string; region: ShellRegion; component: ComponentType }>;
}

export interface PluginLoader {
  loadFromManifests(manifests: PluginManifest[]): Promise<LoadedPlugin[]>;
  loadPlugin(manifest: PluginManifest): Promise<LoadedPlugin>;
}

export function createPluginLoader(registry: ComponentRegistry): PluginLoader {
  const loaded = new Map<string, LoadedPlugin>();

  async function loadPlugin(manifest: PluginManifest): Promise<LoadedPlugin> {
    if (loaded.has(manifest.id)) {
      return loaded.get(manifest.id)!;
    }

    const contributions = manifest.frontend?.contributions ?? [];
    const loadedContributions: LoadedPlugin['contributions'] = [];

    for (const contrib of contributions) {
      try {
        const module = await import(/* @vite-ignore */ contrib.componentPath);
        const Component = module.default ?? module[Object.keys(module)[0] ?? ''];

        if (Component) {
          const contribution = {
            id: `${manifest.id}:${contrib.id}`,
            region: contrib.region,
            component: Component as ComponentType,
            order: contrib.order,
          };
          registry.register(contribution);
          loadedContributions.push(contribution);
        }
      } catch (err) {
        console.warn(`Failed to load contribution ${contrib.id} from plugin ${manifest.id}:`, err);
      }
    }

    const plugin: LoadedPlugin = { manifest, contributions: loadedContributions };
    loaded.set(manifest.id, plugin);
    return plugin;
  }

  return {
    async loadFromManifests(manifests: PluginManifest[]): Promise<LoadedPlugin[]> {
      const results: LoadedPlugin[] = [];
      for (const manifest of manifests) {
        const plugin = await loadPlugin(manifest);
        results.push(plugin);
      }
      return results;
    },

    loadPlugin,
  };
}
