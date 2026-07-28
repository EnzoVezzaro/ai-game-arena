# Game Examples

> Reference implementations for different game types and adapter patterns.

---

## Example 1: Chess (Native UCI Engine)

### Manifest

```json
{
  "id": "chess",
  "name": "Chess",
  "version": "1.0.0",
  "type": "game",
  "adapterType": "native",
  "description": "Chess adapter using Stockfish UCI engine",
  "engines": { "aga": "^1.0.0" },
  "entry": "./dist/index.js",
  "activation": { "startup": false },
  "contributions": { "games": ["chess"] },
  "launchConfig": {
    "command": "stockfish",
    "args": [],
    "env": {},
    "ports": [
      { "name": "controller", "internal": 0, "protocol": "stdio" },
      { "name": "observation", "internal": 0, "protocol": "stdio" }
    ]
  },
  "controllerInterface": {
    "type": "stdio",
    "capabilities": ["move_piece", "get_legal_moves", "evaluate", "resign", "draw"]
  },
  "observationInterface": {
    "types": ["board-state", "metadata"],
    "transport": "stdio"
  },
  "dependencies": {
    "controller.basic": "^1.0.0",
    "observation.board": "^1.0.0"
  }
}
```

### Adapter Implementation

```typescript
// games/chess/src/adapter.ts
export class ChessAdapter implements GameAdapter {
  readonly manifest = require('../game.json');
  private process: ChildProcess | null = null;
  private state: ChessState;
  private controller: ChessControllerAdapter;
  private observation: ChessObservationAdapter;

  async initialize(config: GameConfig): Promise<void> {
    this.state = createInitialState(config.seed);
    this.controller = new ChessControllerAdapter(this);
    this.observation = new ChessObservationAdapter(this);
  }

  async launch(): Promise<GameProcess> {
    this.process = spawn('stockfish', [], { stdio: ['pipe', 'pipe', 'pipe'] });
    
    // Initialize UCI
    this.process.stdin.write('uci\n');
    this.process.stdin.write('isready\n');
    this.process.stdin.write('ucinewgame\n');
    
    await this.waitForReady();
    
    return {
      pid: this.process.pid!,
      controllerPort: 0,
      observationPort: 0,
      stop: () => this.stop(),
    };
  }

  async attachController(adapter: ControllerAdapter): Promise<void> {
    await this.controller.connect(adapter as ChessControllerAdapter);
  }

  async attachObservation(adapter: ObservationAdapter): Promise<void> {
    await this.observation.connect(adapter as ChessObservationAdapter);
  }

  async start(): Promise<void> {
    // Chess is turn-based, no continuous loop needed
  }

  async stop(): Promise<void> {
    this.process?.stdin.write('quit\n');
    await this.waitForExit();
  }

  async suspend(): Promise<void> {
    // No-op for turn-based
  }

  async resume(): Promise<void> {
    // No-op for turn-based
  }

  async dispose(): Promise<void> {
    await this.stop();
    this.process = null;
  }

  getMetadata(): GameMetadata {
    return {
      name: 'Chess',
      type: 'turn-based',
      maxPlayers: 2,
      minPlayers: 2,
      averageDuration: 600, // seconds
    };
  }

  getCapabilities(): GameCapability[] {
    return ['move_piece', 'get_legal_moves', 'evaluate', 'resign', 'draw'];
  }
}
```

### Controller Adapter (UCI Protocol)

```typescript
// games/chess/src/controller-adapter.ts
export class ChessControllerAdapter implements ControllerAdapter {
  readonly gameId = 'chess';
  private pendingCommands = new Map<string, Resolver<ActionResult>>();

  constructor(private chessAdapter: ChessAdapter) {}

  async connect(_: ControllerAdapter): Promise<void> {
    // Already connected via stdio
  }

  async sendAction(action: ControllerAction): Promise<ActionResult> {
    const id = crypto.randomUUID();
    
    switch (action.tool) {
      case 'move_piece':
        return this.executeMove(action.agentId, action.params);
      case 'get_legal_moves':
        return this.getLegalMoves(action.agentId);
      case 'evaluate':
        return this.evaluatePosition(action.agentId);
      case 'resign':
        return this.resign(action.agentId);
      case 'draw':
        return this.offerDraw(action.agentId);
      default:
        throw new Error(`Unknown tool: ${action.tool}`);
    }
  }

  private async executeMove(agentId: string, params: any): Promise<ActionResult> {
    const { from, to, promotion } = params;
    const move = `${from}${to}${promotion || ''}`;
    
    // Validate
    const legal = await this.getLegalMovesInternal();
    if (!legal.includes(move)) {
      return { success: false, error: 'Illegal move' };
    }

    // Apply to local state
    this.chessAdapter.state = this.chessAdapter.state.makeMove(move);
    
    // Send to engine
    this.chessAdapter.process!.stdin.write(`position fen ${this.chessAdapter.state.fen}\n`);
    this.chessAdapter.process!.stdin.write(`go depth 1\n`);
    
    return { 
      success: true, 
      data: { move, fen: this.chessAdapter.state.fen },
      events: [{ type: 'MoveExecuted', move, agentId }]
    };
  }

  async getGameState(): Promise<GameState> {
    return {
      fen: this.chessAdapter.state.fen,
      turn: this.chessAdapter.state.turn,
      legalMoves: await this.getLegalMovesInternal(),
      inCheck: this.chessAdapter.state.inCheck,
      gameOver: this.chessAdapter.state.gameOver,
      winner: this.chessAdapter.state.winner,
    };
  }
}
```

---

## Example 2: Battle Tanks (Native C++ Game)

### Architecture

```
Battle Tanks (C++)
├── Game Loop (20Hz fixed timestep)
├── Physics Engine (Box2D)
├── Network Layer (WebSocket server)
│   ├── Controller Port: 8080
│   └── Observation Port: 8081
└── AGA Protocol Handler
```

### AGA Protocol (JSON over WebSocket)

```typescript
// games/battle-tanks/src/protocol.ts
export enum AgAMessageType {
  // Game → Arena
  Ready = 'aga:ready',
  State = 'aga:state',
  Observation = 'aga:observation',
  Event = 'aga:event',
  Error = 'aga:error',
  
  // Arena → Game
  Action = 'aga:action',
  Start = 'aga:start',
  Pause = 'aga:pause',
  Resume = 'aga:resume',
  Reset = 'aga:reset',
  Capture = 'aga:capture',
}

export interface AgAReadyMessage {
  type: AgAMessageType.Ready;
  capabilities: string[];
  version: string;
  config: TankGameConfig;
}

export interface AgAActionMessage {
  type: AgAMessageType.Action;
  id: string;
  agentId: string;
  action: string;
  params: Record<string, unknown>;
}

export interface AgAResultMessage {
  type: 'aga:result';
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface AgAStateMessage {
  type: AgAMessageType.State;
  tick: number;
  entities: TankEntity[];
  projectiles: Projectile[];
  terrain: TerrainUpdate;
  scores: Record<string, number>;
}

export interface AgAObservationMessage {
  type: AgAMessageType.Observation;
  id: string;
  agentId: string;
  data: ObservationData;
  metadata: ObservationMetadata;
}
```

### Native Game Main Loop

```cpp
// games/battle-tanks/src/main.cpp
#include "aga_protocol.h"
#include "game_engine.h"
#include "websocket_server.h"

int main(int argc, char* argv[]) {
    // Parse AGA config from environment
    int controllerPort = std::stoi(std::getenv("AGA_CONTROLLER_PORT"));
    int observationPort = std::stoi(std::getenv("AGA_OBSERVATION_PORT"));
    int seed = std::getenv("AGA_SEED") ? std::stoi(std::getenv("AGA_SEED")) : random_seed();

    // Initialize game engine
    GameEngine engine(seed);
    engine.initialize();

    // Start WebSocket servers
    WebSocketServer controllerServer(controllerPort);
    WebSocketServer observationServer(observationPort);

    // Handle controller connections
    controllerServer.onConnection([&](autoMessage([&](auto conn, auto msg) {
        auto action = parseAction(msg);
        auto result = engine.executeAction(action);
        conn->send(makeResultMessage(action.id, result));
    }));

    // Handle observation requests
    observationServer.onMessage([&](auto conn, auto msg) {
        if (msg.type == AgAMessageType::Capture) {
            auto obs = engine.captureObservation(msg.agentId);
            conn->send(makeObservationMessage(msg.id, msg.agentId, obs));
        }
    });

    // Send ready signal
    controllerServer.broadcast(makeReadyMessage(engine.getCapabilities()));
    observationServer.broadcast(makeReadyMessage(engine.getCapabilities()));

    // Game loop
    while (engine.isRunning()) {
        auto start = std::chrono::high_resolution_clock::now();
        
        engine.tick();
        
        // Broadcast state to all controller connections
        controllerServer.broadcast(makeStateMessage(engine.getState()));
        
        // 20Hz = 50ms per tick
        auto elapsed = std::chrono::high_resolution_clock::now() - start;
        auto sleepTime = std::chrono::milliseconds(50) - elapsed;
        if (sleepTime > std::chrono::milliseconds::zero()) {
            std::this_thread::sleep_for(sleepTime);
        }
    }

    return 0;
}
```

### Adapter (TypeScript Bridge)

```typescript
// games/battle-tanks/src/adapter.ts
export class BattleTanksAdapter implements GameAdapter {
  readonly manifest = require('../game.json');
  private process: GameProcess | null = null;
  private controllerClient: WebSocketClient;
  private observationClient: WebSocketClient;
  private stateSubject = new Subject<GameState>();

  async initialize(config: GameConfig): Promise<void> {
    // Config validation
  }

  async launch(): Promise<GameProcess> {
    this.process = await NativeGameProcess.launch({
      command: './battle-tanks',
      args: ['--aga-mode'],
      ports: [
        { name: 'controller', internal: 0, protocol: 'websocket' },
        { name: 'observation', internal: 0, protocol: 'websocket' },
      ],
    });

    // Connect to game's WebSocket servers
    this.controllerClient = new WebSocketClient(`ws://localhost:${this.process.controllerPort}`);
    this.observationClient = new WebSocketClient(`ws://localhost:${this.process.observationPort}`);

    await Promise.all([
      this.controllerClient.connect(),
      this.observationClient.connect(),
    ]);

    // Wait for ready
    await this.waitForReady();

    // Subscribe to state updates
    this.controllerClient.onMessage('aga:state', (msg) => {
      this.stateSubject.next(this.transformState(msg));
    });

    return this.process;
  }

  async attachController(adapter: ControllerAdapter): Promise<void> {
    const tankAdapter = adapter as BattleTanksControllerAdapter;
    tankAdapter.setClient(this.controllerClient);
    tankAdapter.setStateStream(this.stateSubject.asObservable());
  }

  async attachObservation(adapter: ObservationAdapter): Promise<void> {
    const tankAdapter = adapter as BattleTanksObservationAdapter;
    tankAdapter.setClient(this.observationClient);
  }

  async start(): Promise<void> {
    this.controllerClient.send({ type: 'aga:start' });
  }

  async stop(): Promise<void> {
    this.controllerClient.send({ type: 'aga:stop' });
    await this.process?.stop();
  }

  async suspend(): Promise<void> {
    this.controllerClient.send({ type: 'aga:pause' });
  }

  async resume(): Promise<void> {
    this.controllerClient.send({ type: 'aga:resume' });
  }

  async dispose(): Promise<void> {
    await this.stop();
    this.controllerClient.disconnect();
    this.observationClient.disconnect();
  }
}
```

---

## Example 3: Browser Game (Phaser.js)

### Manifest

```json
{
  "id": "space-shooter",
  "name": "Space Shooter",
  "version": "1.0.0",
  "type": "game",
  "adapterType": "browser",
  "description": "Phaser.js browser game adapter",
  "engines": { "aga": "^1.0.0" },
  "entry": "./dist/index.js",
  "launchConfig": {
    "url": "https://games.example.com/space-shooter",
    "headless": true
  },
  "controllerInterface": {
    "type": "cdp",
    "capabilities": ["move", "shoot", "boost", "shield"]
  },
  "observationInterface": {
    "types": ["screenshot", "accessibility-tree"],
    "transport": "cdp"
  }
}
```

### Adapter (Playwright + CDP)

```typescript
// games/space-shooter/src/adapter.ts
export class SpaceShooterAdapter implements GameAdapter {
  readonly manifest = require('../game.json');
  private browser: Browser | null = null;
  private page: Page | null = null;
  private cdp: CDPSession | null = null;

  async initialize(config: GameConfig): Promise<void> {
    this.browser = await chromium.launch({ 
      headless: config.headless ?? true,
      args: ['--disable-web-security', '--enable-automation']
    });
  }

  async launch(): Promise<GameProcess> {
    this.page = await this.browser!.newPage();
    this.cdp = await this.page.context().newCDPSession(this.page);
    
    await this.cdp.send('Runtime.enable');
    await this.cdp.send('Input.enable');
    await this.cdp.send('Page.enable');
    await this.cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false });

    await this.page!.goto(this.manifest.launchConfig.url!, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });

    // Inject AGA bridge
    await this.page!.addInitScript(() => {
      window.agaBridge = {
        actions: new Map(),
        registerAction: (name, fn) => window.agaBridge.actions.set(name, fn),
        executeAction: (name, params) => window.agaBridge.actions.get(name)?.(params),
      };
      
      // Hook into game's input system
      const originalHandleInput = game.handleInput;
      game.handleInput = (input) => {
        if (window.agaBridge.currentAction) {
          input = { ...input, ...window.agaBridge.currentAction };
          window.agaBridge.currentAction = null;
        }
        return originalHandleInput(input);
      };
    });

    // Wait for game ready
    await this.page!.waitForFunction(() => window.game?.initialized === true, { timeout: 30000 });

    return {
      pid: 0,
      controllerPort: 0,
      observationPort: 0,
      stop: () => this.stop(),
    };
  }

  async attachController(adapter: ControllerAdapter): Promise<void> {
    const browserAdapter = adapter as BrowserControllerAdapter;
    browserAdapter.setPage(this.page!);
    browserAdapter.setCDP(this.cdp!);
  }

  async attachObservation(adapter: ObservationAdapter): Promise<void> {
    const browserAdapter = adapter as BrowserObservationAdapter;
    browserAdapter.setPage(this.page!);
    browserAdapter.setCDP(this.cdp!);
  }

  async start(): Promise<void> {
    await this.page!.evaluate(() => window.game.start());
  }

  async stop(): Promise<void> {
    await this.page!.evaluate(() => window.game.stop());
    await this.browser?.close();
  }

  async suspend(): Promise<void> {
    await this.page!.evaluate(() => window.game.pause());
  }

  async resume(): Promise<void> {
    await this.page!.evaluate(() => window.game.resume());
  }

  async dispose(): Promise<void> {
    await this.stop();
    this.browser = null;
  }
}
```

### Browser Controller Adapter

```typescript
// games/space-shooter/src/controller-adapter.ts
export class BrowserControllerAdapter implements ControllerAdapter {
  readonly gameId = 'space-shooter';
  private page: Page | null = null;
  private cdp: CDPSession | null = null;

  setPage(page: Page) { this.page = page; }
  setCDP(cdp: CDPSession) { this.cdp = cdp; }

  async connect(): Promise<void> {
    // Already connected via page
  }

  async sendAction(action: ControllerAction): Promise<ActionResult> {
    const { tool, params } = action;
    
    // Inject action into game via AGA bridge
    await this.page!.evaluate(
      ({ tool, params }) => {
        window.agaBridge.currentAction = { tool, params };
      },
      { tool, params }
    );

    // Trigger input handling
    await this.cdp!.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: 0, y: 0, // Dummy to trigger game loop
    });

    return { success: true };
  }

  async getGameState(): Promise<GameState> {
    return this.page!.evaluate(() => window.game.getState());
  }
}
```

---

## Example 4: WASM Game (Rust)

### Cargo.toml

```toml
[package]
name = "aga-wasm-game"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
rand = { version = "0.8", features = ["wasm-bindgen"] }
```

### Rust Core

```rust
// games/wasm-game/src/lib.rs
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
    
    #[wasm_bindgen(js_namespace = aga)]
    fn send_observation(agent_id: &str, data: &str);
    
    #[wasm_bindgen(js_namespace = aga)]
    fn send_event(event_type: &str, payload: &str);
}

#[derive(Serialize, Deserialize)]
struct GameConfig {
    seed: u64,
    width: u32,
    height: u32,
}

#[derive(Serialize, Deserialize)]
struct Action {
    agent_id: String,
    tool: String,
    params: HashMap<String, serde_json::Value>,
}

#[derive(Serialize, Deserialize)]
struct ActionResult {
    success: bool,
    data: Option<serde_json::Value>,
    error: Option<String>,
}

#[wasm_bindgen]
pub struct GameEngine {
    rng: rand::rngs::StdRng,
    state: GameState,
    agents: HashMap<String, Agent>,
}

#[wasm_bindgen]
impl GameEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(config: JsValue) -> Result<GameEngine, JsValue> {
        let config: GameConfig = serde_wasm_bindgen::from_value(config)?;
        let rng = rand::rngs::StdRng::seed_from_u64(config.seed);
        let state = GameState::new(config.width, config.height, &mut rng.clone());
        
        Ok(GameEngine { rng, state, agents: HashMap::new() })
    }

    #[wasm_bindgen]
    pub fn register_agent(&mut self, agent_id: String) {
        self.agents.insert(agent_id, Agent::default());
    }

    #[wasm_bindgen]
    pub fn execute_action(&mut self, action: JsValue) -> Result<JsValue, JsValue> {
        let action: Action = serde_wasm_bindgen::from_value(action)?;
        let agent = self.agents.get_mut(&action.agent_id).ok_or("Agent not found")?;
        
        let result = match action.tool.as_str() {
            "move" => self.execute_move(agent, &action.params),
            "attack" => self.execute_attack(agent, &action.params),
            "scan" => self.execute_scan(agent, &action.params),
            _ => Err(format!("Unknown tool: {}", action.tool)),
        };

        let result = match result {
            Ok(data) => ActionResult { success: true, data: Some(data), error: None },
            Err(e) => ActionResult { success: false, data: None, error: Some(e) },
        };

        Ok(serde_wasm_bindgen::to_value(&result)?)
    }

    #[wasm_bindgen]
    pub fn tick(&mut self) {
        self.state.tick();
        
        // Send observations to all agents
        for (agent_id, agent) in &self.agents {
            let obs = self.capture_observation(agent_id, agent);
            let json = serde_json::to_string(&obs).unwrap();
            send_observation(agent_id, &json);
        }
        
        // Send events
        for event in self.state.drain_events() {
            let json = serde_json::to_string(&event).unwrap();
            send_event(&event.event_type, &json);
        }
    }

    #[wasm_bindgen]
    pub fn get_state(&self) -> Result<JsValue, JsValue> {
        Ok(serde_wasm_bindgen::to_value(&self.state)?)
    }
}
```

### TypeScript Adapter

```typescript
// games/wasm-game/src/adapter.ts
export class WasmGameAdapter implements GameAdapter {
  readonly manifest = require('../game.json');
  private engine: any = null;
  private memory: WebAssembly.Memory | null = null;

  async initialize(config: GameConfig): Promise<void> {
    const response = await fetch(new URL('../dist/aga_wasm_game_bg.wasm', import.meta.url));
    const bytes = await response.arrayBuffer();
    
    const imports = {
      env: {
        memory: new WebAssembly.Memory({ initial: 256 }),
        // ... other imports
      },
      aga: {
        send_observation: (agentIdPtr: number, agentIdLen: number, dataPtr: number, dataLen: number) => {
          // Handle observation callback
        },
        send_event: (typePtr: number, typeLen: number, payloadPtr: number, payloadLen: number) => {
          // Handle event callback
        },
      },
    };

    const module = await WebAssembly.instantiate(bytes, imports);
    this.engine = new module.instance.exports.GameEngine(
      JSON.stringify({ seed: config.seed || Date.now(), width: 800, height: 600 })
    );
    this.memory = module.instance.exports.memory;
  }

  async launch(): Promise<GameProcess> {
    return {
      pid: 0,
      controllerPort: 0,
      observationPort: 0,
      stop: () => { /* no-op */ },
    };
  }

  async attachController(adapter: ControllerAdapter): Promise<void> {
    const wasmAdapter = adapter as WasmControllerAdapter;
    wasmAdapter.setEngine(this.engine);
  }

  async attachObservation(adapter: ObservationAdapter): Promise<void> {
    const wasmAdapter = adapter as WasmObservationAdapter;
    wasmAdapter.setEngine(this.engine);
  }

  async start(): Promise<void> {
    // Start game loop
    this.gameLoop = setInterval(() => {
      this.engine.tick();
    }, 50); // 20Hz
  }

  async stop(): Promise<void> {
    clearInterval(this.gameLoop);
  }

  async suspend(): Promise<void> {
    clearInterval(this.gameLoop);
  }

  async resume(): Promise<void> {
    this.gameLoop = setInterval(() => {
      this.engine.tick();
    }, 50);
  }

  async dispose(): Promise<void> {
    await this.stop();
  }
}
```

---

## Example 5: Remote Game (gRPC)

```protobuf
// games/remote-game/proto/game.proto
syntax = "proto3";

package aga.game;

service GameService {
  rpc CreateSession(CreateSessionRequest) returns (CreateSessionResponse);
  rpc ExecuteAction(ActionRequest) returns (ActionResponse);
  rpc CaptureObservation(ObservationRequest) returns (ObservationResponse);
  rpc GetState(GetStateRequest) returns (GetStateResponse);
  rpc TerminateSession(TerminateSessionRequest) returns (TerminateSessionResponse);
}

message CreateSessionRequest {
  string game_id = 1;
  map<string, string> config = 2;
}

message CreateSessionResponse {
  string session_id = 1;
  int32 controller_port = 2;
  int32 observation_port = 3;
}

message ActionRequest {
  string session_id = 1;
  string agent_id = 2;
  string tool = 3;
  map<string, string> params = 4;
}

message ActionResponse {
  bool success = 1;
  string data = 2;
  string error = 3;
}
```

```typescript
// games/remote-game/src/adapter.ts
export class RemoteGameAdapter implements GameAdapter {
  readonly manifest = require('../game.json');
  private client: GameServiceClient;
  private sessionId: string | null = null;

  constructor(private endpoint: string) {
    this.client = new GameServiceClient(endpoint, credentials);
  }

  async initialize(config: GameConfig): Promise<void> {
    const response = await this.client.createSession({
      gameId: this.manifest.id,
      config: { seed: config.seed?.toString() || '', ...config.config },
    });
    this.sessionId = response.sessionId;
  }

  async launch(): Promise<GameProcess> {
    return {
      pid: parseInt(this.sessionId!),
      controllerPort: 0,
      observationPort: 0,
      stop: () => this.stop(),
    };
  }

  async attachController(adapter: ControllerAdapter): Promise<void> {
    const remoteAdapter = adapter as RemoteControllerAdapter;
    remoteAdapter.setClient(this.client, this.sessionId!);
  }

  async attachObservation(adapter: ObservationAdapter): Promise<void> {
    const remoteAdapter = adapter as RemoteObservationAdapter;
    remoteAdapter.setClient(this.client, this.sessionId!);
  }

  async start(): Promise<void> {
    // Remote games typically auto-start
  }

  async stop(): Promise<void> {
    if (this.sessionId) {
      await this.client.terminateSession({ sessionId: this.sessionId });
    }
  }

  async suspend(): Promise<void> {
    // Not typically supported for remote
  }

  async resume(): Promise<void> {
    // Not typically supported for remote
  }

  async dispose(): Promise<void> {
    await this.stop();
    this.client.close();
  }
}
```

---

## Summary: Adapter Type Comparison

| Aspect | Native | Browser | WASM | Remote |
|--------|--------|---------|------|--------|
| **Process** | Child process | Browser context | In-process | Remote server |
| **Communication** | stdio/WebSocket | CDP/Playwright | Function calls | gRPC/REST |
| **Latency** | ~1ms | ~5-10ms | ~0.1ms | ~50-200ms |
| **Isolation** | Process | Browser sandbox | Memory sandbox | Network |
| **Determinism** | Full control | Harder | Full control | Depends on server |
| **Assets** | Local files | CDN/URL | Embedded | Remote |
| **Debugging** | Native debugger | DevTools | Browser DevTools | Server logs |
| **Best for** | Existing executables | Web games | High-perf sandbox | Cloud/robotics |

---

## Choosing an Adapter Type

| Your Game | Recommended Adapter |
|-----------|---------------------|
| Existing C++/Rust/Go executable | Native |
| Unity/Unreal with CLI | Native |
| Web game (Phaser, Three.js, etc.) | Browser |
| High-performance simulation | WASM |
| Robotics/physical hardware | Remote |
| Cloud-hosted game server | Remote |
| Need maximum isolation | Remote/WASM |
| Need maximum performance | Native/WASM |