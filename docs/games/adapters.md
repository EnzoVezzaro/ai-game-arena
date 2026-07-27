# Game Adapters

> A **Game** is an adapter around a native application. Its responsibility is **not** to implement gameplay. The gameplay already exists inside the native game. The Game package simply exposes the minimum integration required for AI Game Arena to interact with it.

---

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Game Arena                             │
├─────────────────────────────────────────────────────────────┤
│  Battle Manager                                              │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────┐  │
│  │  Controller  │◄──►│   Game Adapter   │◄──►│ Observation│  │
│  │   (MCP)      │    │  (Minimal Bridge)│    │  Adapter   │  │
│  └──────────────┘    └────────┬─────────┘    └───────────┘  │
│                               │                               │
│                    ┌──────────┴──────────┐                   │
│                    ▼                     ▼                   │
│            ┌───────────────┐      ┌───────────────┐          │
│            │ Native Input  │      │ Native Render │          │
│            │    API        │      │    API        │          │
│            └───────┬───────┘      └───────┬───────┘          │
│                    │                     │                   │
│                    ▼                     ▼                   │
│            ┌─────────────────────────────────────┐          │
│            │          Native Game                │          │
│            │   (Chess, Minecraft, Browser, etc.) │          │
│            └─────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## Game Adapter Interface

```typescript
// packages/sdk/src/contracts/game.ts
export interface GameAdapter {
  readonly manifest: GameManifest;

  // Lifecycle
  initialize(config: GameConfig): Promise<void>;
  launch(): Promise<GameProcess>;
  attachController(adapter: ControllerAdapter): Promise<void>;
  attachObservation(adapter: ObservationAdapter): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  dispose(): Promise<void>;

  // Metadata
  getMetadata(): GameMetadata;
  getCapabilities(): GameCapability[];
}

export interface GameManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: 'game';
  readonly adapterType: 'native' | 'browser' | 'wasm' | 'remote';
  readonly launchConfig: LaunchConfig;
  readonly controllerInterface: ControllerInterfaceSpec;
  readonly observationInterface: ObservationInterfaceSpec;
  readonly dependencies: Record<string, string>;
}
```

---

## Adapter Types

| Type | Description | Examples |
|------|-------------|----------|
| **native** | Desktop executable, launched as child process | Chess (Stockfish), Minecraft (Java), custom C++ games |
| **browser** | Web-based game, controlled via CDP/Playwright | Browser games, WebGL, Three.js, Phaser |
| **wasm** | WebAssembly module, runs in sandbox | Rust/WASM games, AssemblyScript |
| **remote** | Game runs on separate machine, accessed via network | Cloud gaming, dedicated servers, robotics |

---

## Native Adapter Pattern

### Process Management

```typescript
// packages/controller/src/adapters/native/process-manager.ts
export class NativeGameProcess {
  private process: ChildProcess | null = null;
  private controllerPort: number;
  private observationPort: number;

  constructor(
    private readonly config: LaunchConfig,
    private readonly logger: Logger
  ) {}

  async launch(): Promise<GameProcess> {
    this.controllerPort = await findFreePort();
    this.observationPort = await findFreePort();

    const env = {
      ...process.env,
      ...this.config.env,
      AGA_CONTROLLER_PORT: String(this.controllerPort),
      AGA_OBSERVATION_PORT: String(this.observationPort),
    };

    this.process = spawn(this.config.command, this.config.args, {
      cwd: this.config.workingDirectory,
      env,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    // Handle process events
    this.process.on('error', (err) => this.logger.error('Game process error', err));
    this.process.on('exit', (code) => this.logger.info(`Game exited with code ${code}`));

    // Wait for ready signal
    await this.waitForReady();

    return {
      pid: this.process.pid!,
      controllerPort: this.controllerPort,
      observationPort: this.observationPort,
      stop: () => this.stop(),
    };
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      await this.waitForExit(5000);
      if (!this.process.killed) {
        this.process.kill('SIGKILL');
      }
    }
  }

  private async waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Game launch timeout')), 30000);
      
      this.process!.on('message', (msg) => {
        if (msg?.type === 'aga:ready') {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
  }
}
```

### Native Game Protocol

The native game implements a minimal **AGA protocol** over stdin/stdout or IPC:

```json
// Game → Arena (stdout)
{"type": "aga:ready", "capabilities": ["move", "attack", "scan"]}
{"type": "aga:state", "tick": 42, "entities": [...], "player": "agent-1"}
{"type": "aga:observation", "agentId": "agent-1", "data": {...}}
{"type": "aga:event", "event": {"type": "EntityMoved", ...}}

// Arena → Game (stdin)
{"type": "aga:action", "agentId": "agent-1", "action": "move", "params": {"direction": "north"}}
{"type": "aga:pause"}
{"type": "aga:resume"}
{"type": "aga:reset", "seed": 12345}
```

---

## Controller Adapter

Translates MCP tool calls → native input:

```typescript
// packages/controller/src/adapters/game-controller-adapter.ts
export interface ControllerAdapter {
  readonly gameId: GameId;
  
  // Input injection
  sendAction(action: ControllerAction): Promise<ActionResult>;
  sendBatch(actions: ControllerAction[]): Promise<ActionResult[]>;
  
  // State sync
  getGameState(): Promise<GameState>;
  subscribeToState(handler: StateHandler): Subscription;
  
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export class NativeControllerAdapter implements ControllerAdapter {
  private ws: WebSocket | null = null;
  private pendingRequests = new Map<string, Resolver<ActionResult>>();

  constructor(
    private readonly gameProcess: GameProcess,
    private readonly deviceRegistry: DeviceRegistry
  ) {}

  async connect(): Promise<void> {
    this.ws = new WebSocket(`ws://localhost:${this.gameProcess.controllerPort}`);
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    await new Promise<void>((resolve, reject) => {
      this.ws!.onopen = () => resolve();
      this.ws!.onerror = (err) => reject(err);
    });
  }

  async sendAction(action: ControllerAction): Promise<ActionResult> {
    const id = crypto.randomUUID();
    const promise = new Promise<ActionResult>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      setTimeout(() => reject(new Error('Action timeout')), 5000);
    });

    this.ws!.send(JSON.stringify({
      type: 'aga:action',
      id,
      agentId: action.agentId,
      action: action.tool,
      params: action.params,
    }));

    return promise;
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'aga:result':
        const resolver = this.pendingRequests.get(message.id);
        if (resolver) {
          this.pendingRequests.delete(message.id);
          resolver.resolve(message.result);
        }
        break;
      case 'aga:state':
        this.stateHandlers.forEach(h => h(message.state));
        break;
      case 'aga:event':
        this.eventBus.publish(message.event);
        break;
    }
  }
}
```

---

## Observation Adapter

Translates native render/state → Observation:

```typescript
// packages/observation/src/adapters/game-observation-adapter.ts
export interface ObservationAdapter {
  readonly gameId: GameId;
  
  // Capture
  capture(agentId: AgentId): Promise<Observation>;
  captureAll(): Promise<Map<AgentId, Observation>>;
  
  // Stream
  subscribe(agentId: AgentId, handler: ObservationHandler): Subscription;
  unsubscribe(agentId: AgentId): void;
  
  // Config
  setConfig(config: ObservationConfig): void;
  getConfig(): ObservationConfig;
}

export class NativeObservationAdapter implements ObservationAdapter {
  private ws: WebSocket | null = null;
  private handlers = new Map<AgentId, ObservationHandler[]>();

  async capture(agentId: AgentId): Promise<Observation> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const timeout = setTimeout(() => reject(new Error('Capture timeout')), 5000);
      
      const handler = (msg: any) => {
        if (msg.id === id && msg.type === 'aga:observation') {
          clearTimeout(timeout);
          this.ws!.off('message', handler);
          resolve(this.transformObservation(msg.data, agentId));
        }
      };
      
      this.ws!.on('message', handler);
      this.ws!.send(JSON.stringify({ type: 'aga:capture', id, agentId }));
    });
  }

  private transformObservation(raw: any, agentId: AgentId): Observation {
    return {
      timestamp: Date.now(),
      agentId,
      type: this.config.defaultType,
      data: this.config.transformer ? this.config.transformer(raw) : raw,
      metadata: {
        captureDurationMs: 0,
        source: this.gameId,
        version: '1.0.0',
        filtersApplied: [],
        transformsApplied: [],
      },
    };
  }
}
```

---

## Game Manifest

```json
// games/my-game/arena-plugin.json
{
  "id": "my-game",
  "name": "My Game",
  "version": "1.0.0",
  "type": "game",
  "adapterType": "native",
  "description": "Adapter for My Game native executable",
  "engines": { "aga": "^1.0.0" },
  "entry": "./dist/index.js",
  "activation": { "startup": false },
  "contributions": {
    "games": ["my-game"]
  },
  "launchConfig": {
    "command": "./my-game-executable",
    "args": ["--aga-mode", "--port=0"],
    "env": {
      "AGA_GAME_ID": "my-game"
    },
    "workingDirectory": "/opt/my-game",
    "ports": [
      { "name": "controller", "internal": 0, "protocol": "websocket" },
      { "name": "observation", "internal": 0, "protocol": "websocket" }
    ]
  },
  "controllerInterface": {
    "type": "websocket",
    "capabilities": ["move", "attack", "scan", "interact"]
  },
  "observationInterface": {
    "types": ["screenshot", "board-state", "metadata"],
    "transport": "websocket"
  },
  "dependencies": {
    "controller.basic": "^1.0.0",
    "observation.screenshot": "^1.0.0"
  }
}
```

---

## Game Directory Structure

```
games/
  my-game/
    arena-plugin.json          # Manifest
    package.json               # NPM package
    tsconfig.json
    src/
      index.ts                 # Export default MyGameAdapter
      adapter.ts               # GameAdapter implementation
      process.ts               # Process management
      protocol.ts              # AGA protocol messages
      controller-adapter.ts    # ControllerAdapter implementation
      observation-adapter.ts   # ObservationAdapter implementation
      types.ts                 # Game-specific types
    dist/
    tests/
      adapter.test.ts
      integration.test.ts
```

---

## Browser Adapter

For web-based games (uses Playwright/CDP):

```typescript
// packages/controller/src/adapters/browser/browser-adapter.ts
export class BrowserGameAdapter implements GameAdapter {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private cdpSession: CDPSession | null = null;

  async initialize(config: GameConfig): Promise<void> {
    this.browser = await playwright.chromium.launch({
      headless: config.headless ?? true,
      args: ['--disable-web-security', '--allow-running-insecure-content'],
    });
    
    this.page = await this.browser.newPage();
    this.cdpSession = await this.page.context().newCDPSession(this.page);
    
    // Enable domains
    await this.cdpSession.send('Runtime.enable');
    await this.cdpSession.send('Input.enable');
    await this.cdpSession.send('Page.enable');
  }

  async launch(): Promise<GameProcess> {
    await this.page!.goto(this.config.url!, { waitUntil: 'networkidle' });
    
    // Inject AGA bridge script
    await this.page!.addInitScript(() => {
      window.agaBridge = {
        sendAction: (action) => { /* postMessage to parent */ },
        getState: () => game.getState(),
        capture: () => game.captureCanvas(),
      };
    });

    return {
      pid: 0,
      controllerPort: 0,
      observationPort: 0,
      stop: () => this.stop(),
    };
  }

  async attachController(adapter: ControllerAdapter): Promise<void> {
    // Inject input handling
    await this.cdpSession!.send('Input.dispatchMouseEvent', { ... });
    await this.cdpSession!.send('Input.dispatchKeyEvent', { ... });
  }
}
```

---

## WASM Adapter

```typescript
// packages/controller/src/adapters/wasm/wasm-adapter.ts
export class WasmGameAdapter implements GameAdapter {
  private module: WebAssembly.Module | null = null;
  private instance: WebAssembly.Instance | null = null;
  private memory: WebAssembly.Memory | null = null;

  async initialize(config: GameConfig): Promise<void> {
    const response = await fetch(config.wasmUrl!);
    const bytes = await response.arrayBuffer();
    
    this.module = await WebAssembly.compile(bytes);
    const imports = this.createImports();
    this.instance = await WebAssembly.instantiate(this.module, imports);
    this.memory = this.instance.exports.memory as WebAssembly.Memory;
  }

  async launch(): Promise<GameProcess> {
    const init = this.instance!.exports.init as Function;
    init(this.config.seed || Date.now());
    
    return {
      pid: 0,
      controllerPort: 0,
      observationPort: 0,
      stop: () => { /* cleanup */ },
    };
  }

  async attachController(adapter: ControllerAdapter): Promise<void> {
    // Expose controller functions to WASM
    this.instance!.exports.set_controller = (actionPtr: number) => {
      const action = this.readAction(actionPtr);
      adapter.sendAction(action);
    };
  }

  private createImports(): WebAssembly.Imports {
    return {
      env: {
        aga_log: (ptr: number, len: number) => this.log(ptr, len),
        aga_send_observation: (ptr: number, len: number) => this.sendObservation(ptr, len),
        // ...
      },
    };
  }
}
```

---

## Remote Adapter

```typescript
// packages/controller/src/adapters/remote/remote-adapter.ts
export class RemoteGameAdapter implements GameAdapter {
  private client: GrpcClient | WebSocketClient;

  constructor(
    private readonly endpoint: string,
    private readonly auth: AuthConfig
  ) {}

  async initialize(config: GameConfig): Promise<void> {
    this.client = new GrpcClient(this.endpoint, this.auth);
    await this.client.connect();
  }

  async launch(): Promise<GameProcess> {
    const session = await this.client.createSession({
      gameId: this.manifest.id,
      config: this.config,
    });
    
    return {
      pid: session.id,
      controllerPort: session.controllerPort,
      observationPort: session.observationPort,
      stop: () => this.client.terminateSession(session.id),
    };
  }
}
```

---

## Testing Adapters

```typescript
// tests/adapter.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MyGameAdapter } from '../src/adapter';

describe('MyGameAdapter', () => {
  let adapter: MyGameAdapter;
  let mockProcess: MockGameProcess;

  beforeEach(async () => {
    adapter = new MyGameAdapter();
    mockProcess = new MockGameProcess();
    vi.spyOn(adapter, 'launch').mockResolvedValue(mockProcess);
  });

  afterEach(async () => {
    await adapter.dispose();
  });

  it('initializes with config', async () => {
    await adapter.initialize({ seed: 123, headless: true });
    expect(mockProcess.initialized).toBe(true);
  });

  it('launches game process', async () => {
    const process = await adapter.launch();
    expect(process.pid).toBeGreaterThan(0);
  });

  it('attaches controller and sends actions', async () => {
    const controllerAdapter = createMockControllerAdapter();
    await adapter.attachController(controllerAdapter);
    
    await adapter.start();
    
    const result = await controllerAdapter.sendAction({
      agentId: 'agent-1',
      tool: 'move',
      params: { direction: 'north' },
    });
    
    expect(result.success).toBe(true);
  });

  it('attaches observation and captures', async () => {
    const obsAdapter = createMockObservationAdapter();
    await adapter.attachObservation(obsAdapter);
    
    const observation = await obsAdapter.capture('agent-1');
    expect(observation.agentId).toBe('agent-1');
    expect(observation.data).toBeDefined();
  });

  it('handles game lifecycle', async () => {
    await adapter.start();
    expect(mockProcess.running).toBe(true);
    
    await adapter.suspend();
    expect(mockProcess.suspended).toBe(true);
    
    await adapter.resume();
    expect(mockProcess.running).toBe(true);
    
    await adapter.stop();
    expect(mockProcess.stopped).toBe(true);
  });
});
```

---

## Forbidden Patterns

| Pattern | Forbidden | Correct |
|---------|-----------|---------|
| Game logic in adapter | `if (action === 'move') { applyPhysics() }` | Native game handles physics |
| AI reasoning in adapter | `chooseBestMove(state)` | Agent runtime handles reasoning |
| Direct input simulation | `robotjs.keyTap('w')` | Controller adapter via MCP |
| Observation processing | `compressScreenshot(img)` | Observation pipeline handles transform |
| Networking in adapter | `fetch('/api/move', ...)` | Controller/Observation adapters handle transport |
| Hardcoded game paths | `'C:/Games/MyGame/game.exe'` | Configurable via manifest/launchConfig |

---

## Integration Checklist

- [ ] Manifest declares `adapterType` correctly
- [ ] `launchConfig` specifies command, args, env, ports
- [ ] `controllerInterface` matches Controller capabilities
- [ ] `observationInterface` matches Observation types
- [ ] Implements all `GameAdapter` lifecycle methods
- [ ] Handles process cleanup on stop/dispose
- [ ] Supports suspend/resume for battle pause
- [ ] Emits `aga:ready` on startup
- [ ] Responds to `aga:action` within timeout
- [ ] Streams `aga:state` and `aga:observation`
- [ ] Tests cover launch, action, observation, lifecycle
- [ ] Runs in headless mode for CI