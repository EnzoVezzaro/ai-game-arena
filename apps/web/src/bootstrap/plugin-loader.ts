import type { ComponentRegistry } from '../runtime/registry/component-registry';

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  category: string;
  description?: string;
  author?: string;
  contributions?: {
    uiPanels?: Array<{
      id: string;
      component: string;
      label: string;
      position: string;
      type: string;
    }>;
    mcpTools?: string[];
    eventHandlers?: string[];
    serverRoutes?: string[];
  };
}

export async function loadPluginContributions(
  registry: ComponentRegistry,
): Promise<void> {
  try {
    const response = await fetch('/api/plugins');
    if (!response.ok) return;

    const plugins = (await response.json()) as PluginManifest[];

    for (const plugin of plugins) {
      const frontendContribs = plugin.contributions?.uiPanels;
      if (!frontendContribs || frontendContribs.length === 0) continue;

      for (const contrib of frontendContribs) {
        try {
          const module = await import(
            /* @vite-ignore */ contrib.component
          );
          const componentKeys = Object.keys(module);
          const Component =
            module.default ??
            (componentKeys.length > 0
              ? module[componentKeys[0] as string]
              : undefined);

          if (Component) {
            registry.register({
              id: `${plugin.id}:${contrib.id}`,
              region: contrib.position as ComponentRegistry['getByRegion'] extends (r: infer R) => unknown[] ? R : 'workspace',
              component: Component as React.ComponentType,
              order: 0,
            });
          }
        } catch {
          console.warn(
            `Could not load UI contribution ${contrib.id} from plugin ${plugin.id}`,
          );
        }
      }
    }
  } catch {
    // Plugin loading is best-effort — app works without plugins
  }
}
