import { describe, it, expect } from 'bun:test';
import { PluginManager } from './plugin-manager';

function createNoopDeps() {
  const noop = () => {};
  const noopLogger = {
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    child: () => noopLogger,
  };
  const subscriptions = new Map<string, Array<{ id: string; handler: (e: unknown) => Promise<void> }>>();
  let counter = 0;
  const eventBus = {
    async publish() {},
    subscribe(eventType: string, handler: (e: unknown) => Promise<void>) {
      const id = `sub-${++counter}`;
      if (!subscriptions.has(eventType)) subscriptions.set(eventType, []);
      subscriptions.get(eventType)!.push({ id, handler });
      return { id, unsubscribe: () => {
        const arr = subscriptions.get(eventType);
        if (arr) {
          const idx = arr.findIndex((s) => s.id === id);
          if (idx >= 0) arr.splice(idx, 1);
        }
      }};
    },
    subscribeAll() {},
    unsubscribe() {},
  };
  const storage = {
    async get<T>() { return null as T | null; },
    async set() {},
    async delete() {},
    async has() { return false; },
  };
  return { logger: noopLogger, eventBus, storage, subscriptions };
}

describe('PluginManager', () => {
  it('topologicalSort detects dependency cycles', async () => {
    const deps = createNoopDeps();
    const pm = new PluginManager({
      pluginDirs: [],
      logger: deps.logger as never,
      eventBus: deps.eventBus as never,
      storage: deps.storage as never,
    });

    const manifests = [
      { id: 'a', dependencies: { b: '*' }, activation: { startup: true } } as never,
      { id: 'b', dependencies: { a: '*' }, activation: { startup: true } } as never,
    ];

    let threw = false;
    try {
      (pm as unknown as { topologicalSort: (m: never[]) => never[] }).topologicalSort(manifests);
    } catch (e) {
      threw = true;
      expect((e as Error).message).toMatch(/Dependency cycle detected/);
    }
    expect(threw).toBe(true);
  });

  it('deactivate cleans up event subscriptions', async () => {
    const deps = createNoopDeps();
    const pm = new PluginManager({
      pluginDirs: [],
      logger: deps.logger as never,
      eventBus: deps.eventBus as never,
      storage: deps.storage as never,
    });

    const handler = async () => {};
    const context = (pm as unknown as { createContext: (m: never) => { registerEventHandler: (h: never) => void } }).createContext({
      id: 'test-plugin',
      activation: { startup: true },
      dependencies: {},
    } as never);

    context.registerEventHandler({
      eventTypes: ['TurnStarted'],
      handler,
    } as never);

    const sub = deps.eventBus.subscribe('TurnStarted', handler);

    // Simulate having loaded a plugin with the subscriptions tracked
    (pm as unknown as { plugins: Map<string, unknown> }).plugins.set('test-plugin', {
      manifest: { id: 'test-plugin' },
      context,
      module: {},
      activatedAt: new Date(),
      subscriptions: [sub],
    });

    expect(deps.subscriptions.get('TurnStarted')).toHaveLength(2);

    await pm.deactivate('test-plugin');

    expect(deps.subscriptions.get('TurnStarted')).toHaveLength(1);
  });
});
