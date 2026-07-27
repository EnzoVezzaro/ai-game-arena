# Discovery System

> Automatic, manifest-driven discovery. No manual registration. No central indexes. No hardcoded imports.

---

## Overview

The discovery system is the **foundation** of the platform's extensibility. It enables:

- **Zero-configuration installation** — Drop a folder, it works
- **Marketplace support** — Remote packages discovered identically to local
- **Lazy loading** — Artifacts loaded only when needed
- **Hot reload** — Changes detected and applied without restart
- **Ecosystem growth** — Thousands of artifacts without core changes

---

## Discovery Principles

| Principle | Implementation |
|-----------|----------------|
| **Convention over configuration** | Manifest at known path (`arena-plugin.json`) |
| **Fail fast** | Validate all manifests before loading any code |
| **Dependency order** | Topological sort before activation |
| **Isolation** | Discovery never executes artifact code |
| **Determinism** | Same filesystem state → same discovery result |

---

## Directory Structure

```
/
├── arenas/                 # Arena manifests
│   ├── battle-tanks/
│   │   ├── arena-plugin.json
│   │   └── dist/
│   └── chess-arena/
│       ├── arena-plugin.json
│       └── dist/
├── games/                  # Game manifests (also arenas)
│   ├── battle-tanks/
│   │   ├── arena-plugin.json  # Game + Arena in one
│   │   └── dist/
│   └── chess/
│       ├── arena-plugin.json
│       └── dist/
├── plugins/                # Plugin manifests
│   ├── plugin-chat/
│   │   ├── arena-plugin.json
│   │   └── dist/
│   ├── plugin-polls/
│   └── plugin-rewards/
└── packages/               # Core packages (not discovered)
    ├── sdk/
    ├── core/
    └── runtime/
```

**Key insight:** Games and Arenas share the same manifest format (`arena-plugin.json`). A game *is* an arena that includes a game adapter.

---

## Manifest Discovery

```typescript
// packages/plugin-manager/src/discovery.ts
export interface DiscoveryConfig {
  readonly roots: string[];
  readonly manifestName: string; // 'arena-plugin.json'
  readonly ignorePatterns: string[];
  readonly followSymlinks: boolean;
}

export async function discoverManifests(
  config: DiscoveryConfig
): Promise<DiscoveredManifest[]> {
  const results: DiscoveredManifest[] = [];

  for (const root of config.roots) {
    const entries = await scanDirectory(root, config);
    
    for (const entry of entries) {
      const manifestPath = path.join(entry.path, config.manifestName);
      
      if (await fileExists(manifestPath)) {
        const content = await readFile(manifestPath, 'utf-8');
        const manifest = parseManifest(content);
        
        results.push({
          root,
          path: entry.path,
          manifestPath,
          manifest,
          relativePath: path.relative(root, entry.path),
        });
      }
    }
  }

  return results;
}

async function scanDirectory(
  dir: string,
  config: DiscoveryConfig
): Promise<DirectoryEntry[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: DirectoryEntry[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(dir, entry.name);
      
      // Check ignore patterns
      if (config.ignorePatterns.some(p => minimatch(entry.name, p))) {
        continue;
      }

      results.push({ path: fullPath, name: entry.name });
      
      // Recurse
      const subEntries = await scanDirectory(fullPath, config);
      results.push(...subEntries);
    }
  }

  return results;
}
```

---

## Manifest Schema Validation

Every manifest is validated **before any code executes**:

```typescript
// packages/sdk/src/schemas/validation.ts
export async function validateManifests(
  manifests: DiscoveredManifest[],
  schema: ZodSchema
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const valid: ValidManifest[] = [];

  for (const discovered of manifests) {
    const result = schema.safeParse(discovered.manifest);
    
    if (result.success) {
      valid.push({
        ...discovered,
        manifest: result.data,
      });
    } else {
      errors.push({
        path: discovered.manifestPath,
        errors: result.error.issues.map(i => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
  }

  return { valid, errors };
}
```

**Validation rules:**

| Rule | Severity |
|------|----------|
| Required fields present | Error |
| Version format (semver) | Error |
| ID uniqueness (within type) | Error |
| Dependency references exist | Warning (resolved later) |
| Unknown contribution types | Warning |
| Deprecated fields | Info |

---

## Dependency Resolution

Dependencies are declared in manifests and resolved **topologically**:

```typescript
// packages/plugin-manager/src/dependency-resolution.ts
export interface DependencyGraph {
  readonly nodes: Map<string, ManifestNode>;
  readonly edges: Map<string, Set<string>>; // nodeId -> dependsOn[]
}

export function buildDependencyGraph(
  manifests: ValidManifest[]
): DependencyGraph {
  const nodes = new Map<string, ManifestNode>();
  const edges = new Map<string, Set<string>>();

  // Create nodes
  for (const m of manifests) {
    nodes.set(m.manifest.id, {
      id: m.manifest.id,
      manifest: m.manifest,
      path: m.path,
      type: inferType(m.manifest),
    });
  }

  // Create edges
  for (const m of manifests) {
    const deps = m.manifest.dependencies || {};
    const depSet = new Set<string>();
    
    for (const [depId, depVersion] of Object.entries(deps)) {
      if (nodes.has(depId)) {
        depSet.add(depId);
      } else {
        // External dependency - resolved via package manager
        depSet.add(`external:${depId}@${depVersion}`);
      }
    }
    
    edges.set(m.manifest.id, depSet);
  }

  return { nodes, edges };
}

export function topologicalSort(graph: DependencyGraph): ResolvedOrder {
  const { nodes, edges } = graph;
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const order: ManifestNode[] = [];

  function visit(nodeId: string): void {
    if (visiting.has(nodeId)) {
      throw new CircularDependencyError(
        `Circular dependency detected involving ${nodeId}`
      );
    }
    if (visited.has(nodeId)) return;

    visiting.add(nodeId);
    
    const deps = edges.get(nodeId) || new Set();
    for (const depId of deps) {
      if (!depId.startsWith('external:')) {
        visit(depId);
      }
    }
    
    visiting.delete(nodeId);
    visited.add(nodeId);
    order.push(nodes.get(nodeId)!);
  }

  for (const nodeId of nodes.keys()) {
    if (!visited.has(nodeId)) {
      visit(nodeId);
    }
  }

  return { order, externalDependencies: extractExternal(edges) };
}
```

**Dependency types:**

| Type | Example | Resolution |
|------|---------|------------|
| **Internal** | `"plugin-chat": "^1.0.0"` | Resolved within discovered manifests |
| **External (npm)** | `"@aga/plugin-ml": "^2.0.0"` | Resolved via package manager |
| **Core** | `"aga-runtime": "^1.0.0"` | Validated against runtime version |
| **Peer** | `"aga-core": "^1.0.0"` | Must be provided by runtime |

---

## Contribution Registration

Contributions are registered **without executing plugin code**:

```typescript
// packages/plugin-manager/src/contribution-registration.ts
export interface ContributionRegistrar {
  registerMcpTools(tools: McpTool[]): void;
  registerEventHandlers(handlers: EventHandler[]): void;
  registerUiPanels(panels: UiPanelContribution[]): void;
  registerServerRoutes(routes: ServerRoute[]): void;
  registerCliCommands(commands: CliCommand[]): void;
  registerDashboardWidgets(widgets: DashboardWidget[]): void;
  registerNavigationItems(items: NavigationItem[]): void;
  registerStorage(storages: StorageContribution[]): void;
}

export async function registerContributions(
  manifests: ValidManifest[],
  registrar: ContributionRegistrar
): Promise<RegistrationResult> {
  const results: RegistrationResult = {
    mcpTools: [],
    eventHandlers: [],
    uiPanels: [],
    serverRoutes: [],
    cliCommands: [],
    dashboardWidgets: [],
    navigationItems: [],
    storage: [],
    errors: [],
  };

  for (const manifest of manifests) {
    const contrib = manifest.manifest.contributions || {};
    
    try {
      if (contrib.mcpTools) {
        const tools = loadTools(manifest.path, contrib.mcpTools);
        registrar.registerMcpTools(tools);
        results.mcpTools.push(...tools.map(t => t.id));
      }
      
      if (contrib.eventHandlers) {
        const handlers = loadHandlers(manifest.path, contrib.eventHandlers);
        registrar.registerEventHandlers(handlers);
        results.eventHandlers.push(...handlers.map(h => h.eventType));
      }
      
      if (contrib.uiPanels) {
        const panels = loadPanels(manifest.path, contrib.uiPanels);
        registrar.registerUiPanels(panels);
        results.uiPanels.push(...panels.map(p => p.id));
      }
      
      // ... other contribution types
      
    } catch (error) {
      results.errors.push({
        manifestId: manifest.manifest.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

function loadTools(pluginPath: string, toolIds: string[]): McpTool[] {
  // Load tool definitions from manifest-declared files
  // DO NOT execute plugin main entry point
  const toolsPath = path.join(pluginPath, 'dist', 'tools');
  return toolIds.map(id => loadToolDefinition(toolsPath, id));
}
```

**Critical rule:** Registration reads **static definitions** (JSON, TypeScript types). It never calls `plugin.activate()`.

---

## Activation

Activation happens **after** all contributions are registered:

```typescript
// packages/plugin-manager/src/activation.ts
export async function activatePlugins(
  manifests: ValidManifest[],
  contextFactory: PluginContextFactory
): Promise<ActivationResult> {
  const activated: ActivatedPlugin[] = [];
  const errors: ActivationError[] = [];

  for (const manifest of manifests) {
    if (!manifest.manifest.activation?.startup) continue;

    try {
      const context = contextFactory.create(manifest);
      const plugin = await loadPluginModule(manifest.path);
      
      if (plugin.activate) {
        await plugin.activate(context);
      }
      
      activated.push({
        id: manifest.manifest.id,
        plugin,
        context,
      });
      
    } catch (error) {
      errors.push({
        manifestId: manifest.manifest.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { activated, errors };
}

function createPluginContext(manifest: ValidManifest): PluginContext {
  return {
    manifest: manifest.manifest,
    logger: createLogger(`plugin:${manifest.manifest.id}`),
    config: createConfigReader(manifest.manifest.id),
    storage: createNamespacedStorage(manifest.manifest.id),
    eventBus: getEventBus(),
    
    // Registration APIs (read-only after registration phase)
    registerMcpTool: () => { throw new Error('Registration phase complete'); },
    registerEventHandler: () => { throw new Error('Registration phase complete'); },
    // ...
    
    // Query APIs
    getAvailableTools: () => getToolRegistry().getAll(),
    getAvailableArenas: () => getArenaRegistry().getAll(),
  };
}
```

---

## Hot Reload Discovery

```typescript
// packages/plugin-manager/src/hot-reload.ts
export interface HotReloadWatcher {
  readonly events: EventEmitter<{
    changed: [ChangedArtifacts];
    error: [Error];
  }>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export async function createHotReloadWatcher(
  config: DiscoveryConfig,
  onChange: (artifacts: ChangedArtifacts) => Promise<void>
): Promise<HotReloadWatcher> {
  const watcher = fs.watch(config.roots, { recursive: true });
  let debounceTimer: NodeJS.Timeout;
  let pendingChanges: Set<string> = new Set();

  watcher.on('change', (eventType, filename) => {
    if (!filename) return;
    if (!filename.endsWith('.json') && !filename.endsWith('.js')) return;
    
    const fullPath = path.join(watcher.path, filename);
    pendingChanges.add(fullPath);
    
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const changes = await detectChanges(Array.from(pendingChanges));
      pendingChanges.clear();
      await onChange(changes);
    }, 300);
  });

  return {
    events: watcher,
    async start() {},
    async stop() { watcher.close(); },
  };
}

async function detectChanges(changedPaths: string[]): Promise<ChangedArtifacts> {
  const artifacts: ChangedArtifacts = {
    manifests: [],
    code: [],
    removed: [],
  };

  for (const p of changedPaths) {
    if (await fileExists(p)) {
      if (p.endsWith('arena-plugin.json')) {
        artifacts.manifests.push(p);
      } else {
        artifacts.code.push(p);
      }
    } else {
      artifacts.removed.push(p);
    }
  }

  return artifacts;
}
```

---

## Remote Package Discovery

The same discovery mechanism works for **remote packages**:

```typescript
// packages/plugin-manager/src/remote-discovery.ts
export interface RemotePackageSource {
  readonly name: string;
  readonly url: string;
  readonly auth?: AuthConfig;
}

export async function discoverRemotePackages(
  sources: RemotePackageSource[]
): Promise<DiscoveredManifest[]> {
  const results: DiscoveredManifest[] = [];

  for (const source of sources) {
    const index = await fetchPackageIndex(source);
    
    for (const pkg of index.packages) {
      const manifest = await fetchManifest(source, pkg);
      const validated = validateManifest(manifest);
      
      if (validated.valid) {
        results.push({
          root: `remote:${source.name}`,
          path: pkg.path,
          manifestPath: `${source.url}/${pkg.path}/arena-plugin.json`,
          manifest: validated.data,
          relativePath: pkg.path,
          remote: true,
          source: source.name,
        });
      }
    }
  }

  return results;
}
```

**Remote packages are indistinguishable from local** — same manifest, same registration, same activation.

---

## Discovery Performance

| Phase | Complexity | Optimization |
|-------|------------|--------------|
| Filesystem scan | O(n) directories | Parallel walks, ignore patterns |
| Manifest parsing | O(m) manifests | Streaming JSON parse |
| Schema validation | O(m) manifests | Compiled Zod schemas |
| Dependency resolution | O(v + e) | Kahn's algorithm |
| Contribution registration | O(c) contributions | Batch registration |

**Typical numbers:** 1000 artifacts → ~200ms discovery, ~50ms validation, ~10ms registration.

---

## Forbidden in Discovery

| Pattern | Forbidden | Correct |
|---------|-----------|---------|
| Executing plugin code | `require(pluginPath).activate()` | Static contribution loading |
| Skipping validation | `try { loadPlugin() } catch {}` | Validate all before any load |
| Hardcoded paths | `fs.readdirSync('./plugins')` | Configurable discovery roots |
| Synchronous I/O in hot path | `fs.readFileSync()` | Async with streaming |
| Global manifest cache | `global.manifestCache = {}` | Explicit cache with invalidation |

---

## Testing Discovery

```typescript
// packages/plugin-manager/tests/discovery.test.ts
describe('Discovery', () => {
  it('discovers manifests in nested directories', async () => {
    const fixtures = createFixtureStructure({
      'arenas/tank/arena-plugin.json': validArenaManifest,
      'arenas/tank/dist/index.js': 'export default {}',
      'plugins/chat/arena-plugin.json': validPluginManifest,
      'games/chess/arena-plugin.json': validGameManifest,
    });

    const results = await discoverManifests({
      roots: [fixtures.root],
      manifestName: 'arena-plugin.json',
      ignorePatterns: ['node_modules', 'dist', '*.test.ts'],
      followSymlinks: false,
    });

    expect(results).toHaveLength(3);
    expect(results.map(r => r.manifest.id)).toEqual(
      expect.arrayContaining(['tank-arena', 'plugin-chat', 'chess'])
    );
  });

  it('rejects invalid manifests', async () => {
    const fixtures = createFixtureStructure({
      'bad/arena-plugin.json': { id: 'bad' }, // missing version, name
    });

    const results = await discoverManifests({ roots: [fixtures.root], ... });
    const validation = await validateManifests(results, ArenaPluginSchema);

    expect(validation.valid).toHaveLength(0);
    expect(validation.errors[0].errors).toContainEqual(
      expect.objectContaining({ path: 'version' })
    );
  });

  it('resolves dependencies topologically', async () => {
    const manifests = [
      { id: 'a', dependencies: { b: '^1.0.0' } },
      { id: 'b', dependencies: { c: '^1.0.0' } },
      { id: 'c', dependencies: {} },
    ];

    const order = topologicalSort(buildDependencyGraph(manifests));
    expect(order.order.map(n => n.id)).toEqual(['c', 'b', 'a']);
  });
});
```