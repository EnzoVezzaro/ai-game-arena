# Controller Architecture

> The **Controller is the AI's body**. It exposes virtual input devices through an MCP server and translates high-level actions into native platform input events.

The Controller runs **inside the Arena** and is orchestrated by the Arena during battle execution. The Game never knows whether input came from an AI, human, replay, or script — it only receives native input events.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI AGENT                                      │
│                         (Brain)                                      │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ MCP Protocol
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CONTROLLER                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Keyboard  │  │    Mouse    │  │  Gamepad    │   Devices       │
│  │  (virtual)  │  │  (virtual)  │  │  (virtual)  │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                │                         │
│         └────────────────┼────────────────┘                         │
│                          ▼                                           │
│               ┌─────────────────────┐                               │
│               │    MCP Server       │                               │
│               │  (Tool Registry)    │                               │
│               └──────────┬──────────┘                               │
│                          │                                           │
└──────────────────────────┼──────────────────────────────────────────┘
                           │ Platform Adapter
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NATIVE INPUT SYSTEM                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ Desktop  │ │ Browser  │ │ Terminal │ │   WASM   │  Platforms    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       GAME / APPLICATION                             │
│         (Receives native input, knows nothing about AI)             │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Principle:** The Game never knows whether input originated from:
- An AI agent
- A human player
- A replay
- A scripted automation
- A reinforcement learning policy

It only receives native input events.

---

## Controller Interface

```typescript
// packages/sdk/src/contracts/controller.ts
export interface Controller {
  readonly manifest: ControllerManifest;
  
  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  
  // Device management
  registerDevice(device: InputDevice): void;
  unregisterDevice(deviceId: DeviceId): void;
  getDevice(deviceId: DeviceId): InputDevice | undefined;
  getAllDevices(): InputDevice[];
  
  // MCP Server
  getMcpServer(): McpServer;
  connectAgent(agentId: AgentId, session: MCPSession): Promise<void>;
  disconnectAgent(agentId: AgentId): Promise<void>;
  
  // Execution
  execute(action: ControllerAction): Promise<ActionResult>;
  executeBatch(actions: ControllerAction[]): Promise<ActionResult[]>;
  
  // Capabilities
  getCapabilities(): Capability[];
  getCapabilitiesForAgent(agentId: AgentId): Capability[];
}

export interface ControllerManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: 'controller';
  readonly devices: DeviceManifest[];
  readonly platformAdapters: PlatformAdapterManifest[];
  readonly middleware: MiddlewareManifest[];
}

export interface DeviceManifest {
  readonly id: string;
  readonly type: DeviceType;
  readonly capabilities: string[];
  readonly configSchema: ZodSchema;
}

export type DeviceType = 
  | 'keyboard' 
  | 'mouse' 
  | 'pointer' 
  | 'touch' 
  | 'gamepad' 
  | 'wheel' 
  | 'pen' 
  | 'custom';
```

---

## Virtual Input Devices

Every Controller exposes one or more virtual devices:

### Keyboard

```typescript
export interface KeyboardDevice extends InputDevice {
  readonly type: 'keyboard';
  
  press(key: KeyCode): Promise<void>;
  release(key: KeyCode): Promise<void>;
  type(text: string, options?: TypeOptions): Promise<void>;
  hold(key: KeyCode, durationMs: number): Promise<void>;
  chord(keys: KeyCode[]): Promise<void>;
}

export type KeyCode = 
  // Letters
  | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm'
  | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z'
  // Numbers
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  // Function keys
  | 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'f6' | 'f7' | 'f8' | 'f9' | 'f10' | 'f11' | 'f12'
  // Modifiers
  | 'shift' | 'ctrl' | 'alt' | 'meta' | 'control' | 'option' | 'command' | 'windows'
  // Navigation
  | 'up' | 'down' | 'left' | 'right' | 'home' | 'end' | 'pageup' | 'pagedown'
  // Special
  | 'enter' | 'tab' | 'escape' | 'space' | 'backspace' | 'delete' | 'insert'
  | 'capslock' | 'numlock' | 'scrolllock' | 'printscreen' | 'pause'
  // Numpad
  | 'numpad0' | 'numpad1' | 'numpad2' | 'numpad3' | 'numpad4' 
  | 'numpad5' | 'numpad6' | 'numpad7' | 'numpad8' | 'numpad9'
  | 'numpad+' | 'numpad-' | 'numpad*' | 'numpad/' | 'numpad.' | 'numpadenter'
  // Media
  | 'mediaplay' | 'mediapause' | 'medianext' | 'mediaprev' | 'mediastop'
  | 'volumemute' | 'volumeup' | 'volumedown';
```

### Mouse

```typescript
export interface MouseDevice extends InputDevice {
  readonly type: 'mouse';
  
  move(x: number, y: number, options?: MoveOptions): Promise<void>;
  moveRelative(dx: number, dy: number): Promise<void>;
  click(button?: MouseButton, count?: number): Promise<void>;
  doubleClick(button?: MouseButton): Promise<void>;
  down(button?: MouseButton): Promise<void>;
  up(button?: MouseButton): Promise<void>;
  scroll(dx: number, dy: number): Promise<void>;
  wheel(delta: number): Promise<void>;
}

export type MouseButton = 'left' | 'right' | 'middle' | 'back' | 'forward';

export interface MoveOptions {
  readonly duration?: number;      // ms, default: instant
  readonly steps?: number;         // interpolation steps
  readonly easing?: EasingFunction;
}
```

### Pointer (Unified Mouse/Touch/Pen)

```typescript
export interface PointerDevice extends InputDevice {
  readonly type: 'pointer';
  
  setPosition(x: number, y: number): Promise<void>;
  move(x: number, y: number): Promise<void>;
  down(pointerId: number, button?: number): Promise<void>;
  up(pointerId: number): Promise<void>;
  cancel(pointerId: number): Promise<void>;
}
```

### Touch

```typescript
export interface TouchDevice extends InputDevice {
  readonly type: 'touch';
  
  tap(x: number, y: number): Promise<void>;
  doubleTap(x: number, y: number): Promise<void>;
  longPress(x: number, y: number, duration?: number): Promise<void>;
  swipe(startX: number, startY: number, endX: number, endY: number, duration?: number): Promise<void>;
  pinch(centerX: number, centerY: number, scale: number, duration?: number): Promise<void>;
  rotate(centerX: number, centerY: number, angle: number, duration?: number): Promise<void>;
  multiTouch(touches: TouchPoint[]): Promise<void>;
}

export interface TouchPoint {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly pressure?: number;
}
```

### Gamepad

```typescript
export interface GamepadDevice extends InputDevice {
  readonly type: 'gamepad';
  
  press(button: GamepadButton): Promise<void>;
  release(button: GamepadButton): Promise<void>;
  moveStick(stick: 'left' | 'right', x: number, y: number): Promise<void>;
  trigger(trigger: 'left' | 'right', value: number): Promise<void>;
  dpad(direction: DPadDirection): Promise<void>;
  home(): Promise<void>;
  start(): Promise<void>;
  select(): Promise<void>;
}

export type GamepadButton = 
  | 'a' | 'b' | 'x' | 'y'
  | 'lb' | 'rb' | 'lt' | 'rt'
  | 'ls' | 'rs'  // stick clicks
  | 'dpad-up' | 'dpad-down' | 'dpad-left' | 'dpad-right'
  | 'home' | 'start' | 'select' | 'share' | 'options';

export type DPadDirection = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';
```

### Wheel / Scroll

```typescript
export interface WheelDevice extends InputDevice {
  readonly type: 'wheel';
  
  scroll(deltaX: number, deltaY: number, deltaZ?: number): Promise<void>;
  zoom(factor: number): Promise<void>;
  pan(dx: number, dy: number): Promise<void>;
}
```

### Pen / Stylus

```typescript
export interface PenDevice extends InputDevice {
  readonly type: 'pen';
  
  write(x: number, y: number, pressure: number): Promise<void>;
  move(x: number, y: number, pressure?: number): Promise<void>;
  lift(): Promise<void>;
  erase(x: number, y: number, pressure: number): Promise<void>;
  button(button: PenButton): Promise<void>;
}

export type PenButton = 'tip' | 'eraser' | 'barrel' | 'side';
```

---

## MCP Server

The Controller exposes devices as MCP tools:

```typescript
// packages/controller/src/mcp/mcp-server.ts
export interface McpServer {
  readonly tools: Map<string, McpTool>;
  readonly resources: Map<string, McpResource>;
  
  registerTool(tool: McpTool): void;
  unregisterTool(name: string): void;
  
  handleRequest(request: McpRequest): Promise<McpResponse>;
  handleNotification(notification: McpNotification): Promise<void>;
}
```

### Tool Mapping for Keyboard

```typescript
export const keyboardTools: McpTool[] = [
  {
    name: 'keyboard.press',
    description: 'Press a key',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', enum: KEY_CODES },
        duration: { type: 'number', description: 'Hold duration in ms' },
      },
      required: ['key'],
    },
  },
  {
    name: 'keyboard.type',
    description: 'Type text',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        delay: { type: 'number', description: 'Delay between chars (ms)' },
      },
      required: ['text'],
    },
  },
];
```

### Tool Mapping for Mouse

```typescript
export const mouseTools: McpTool[] = [
  {
    name: 'mouse.move',
    description: 'Move mouse to absolute position',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        duration: { type: 'number' },
      },
      required: ['x', 'y'],
    },
  },
  {
    name: 'mouse.click',
    description: 'Click mouse button',
    inputSchema: {
      type: 'object',
      properties: {
        button: { type: 'string', enum: ['left', 'right', 'middle'] },
        count: { type: 'number', default: 1 },
      },
      required: ['button'],
    },
  },
];
```

### Agent Connection

```typescript
export interface MCPSession {
  readonly agentId: AgentId;
  readonly capabilities: Capability[];
  readonly connectedAt: Date;
  
  sendNotification(notification: McpNotification): Promise<void>;
  close(): Promise<void>;
}

export async function connectAgent(
  controller: Controller,
  agentId: AgentId,
  session: MCPSession
): Promise<void> {
  // Register agent's available tools
  const agentTools = controller.getCapabilitiesForAgent(agentId)
    .filter(c => c.mcpTool)
    .map(c => c.mcpTool);
  
  // Send tool list to agent
  await session.sendNotification({
    method: 'tools/list',
    params: { tools: agentTools },
  });
}
```

---

## Platform Adapters

Translate virtual input → native platform input:

### Desktop (Windows/macOS/Linux)

```typescript
// packages/controller/src/adapters/desktop/desktop-adapter.ts
export class DesktopAdapter implements PlatformAdapter {
  readonly platform = 'desktop';
  
  private robot: RobotJS; // or nut-js, robotjs, etc.
  
  async initialize(): Promise<void> {
    this.robot = await import('robotjs'); // or appropriate lib
  }
  
  async executeKeyboard(action: KeyboardAction): Promise<void> {
    switch (action.type) {
      case 'press':
        this.robot.keyTap(action.key, action.modifiers);
        break;
      case 'type':
        this.robot.typeString(action.text, action.delay);
        break;
      // ...
    }
  }
  
  async executeMouse(action: MouseAction): Promise<void> {
    switch (action.type) {
      case 'move':
        this.robot.moveMouse(action.x, action.y);
        break;
      case 'click':
        this.robot.mouseClick(action.button, action.double);
        break;
      // ...
    }
  }
}
```

### Browser (Playwright/CDP)

```typescript
// packages/controller/src/adapters/browser/browser-adapter.ts
export class BrowserAdapter implements PlatformAdapter {
  readonly platform = 'browser';
  
  private page: Page;
  private cdp: CDPSession;
  
  async initialize(config: BrowserAdapterConfig): Promise<void> {
    this.page = config.page;
    this.cdp = await this.page.context().newCDPSession(this.page);
    await this.cdp.send('Input.enable');
  }
  
  async executeKeyboard(action: KeyboardAction): Promise<void> {
    switch (action.type) {
      case 'press':
        await this.cdp.send('Input.dispatchKeyEvent', {
          type: 'keyDown',
          key: action.key,
          code: action.code,
          modifiers: this.convertModifiers(action.modifiers),
        });
        if (!action.hold) {
          await this.cdp.send('Input.dispatchKeyEvent', {
            type: 'keyUp',
            key: action.key,
            code: action.code,
          });
        }
        break;
      case 'type':
        await this.page.keyboard.type(action.text, { delay: action.delay });
        break;
    }
  }
  
  async executeMouse(action: MouseAction): Promise<void> {
    switch (action.type) {
      case 'move':
        await this.page.mouse.move(action.x, action.y, { steps: action.steps });
        break;
      case 'click':
        await this.page.mouse.click(action.x, action.y, { 
          button: action.button, 
          clickCount: action.count 
        });
        break;
    }
  }
}
```

### Terminal

```typescript
// packages/controller/src/adapters/terminal/terminal-adapter.ts
export class TerminalAdapter implements PlatformAdapter {
  readonly platform = 'terminal';
  
  private stdin: Writable;
  
  async initialize(config: TerminalAdapterConfig): Promise<void> {
    this.stdin = config.stdin;
  }
  
  async executeKeyboard(action: KeyboardAction): Promise<void> {
    if (action.type === 'type') {
      this.stdin.write(action.text);
    } else {
      const escapeCode = this.keyToEscapeCode(action.key);
      this.stdin.write(escapeCode);
    }
  }
  
  private keyToEscapeCode(key: KeyCode): string {
    const codes: Record<string, string> = {
      'up': '\x1b[A',
      'down': '\x1b[B',
      'right': '\x1b[C',
      'left': '\x1b[D',
      'enter': '\r',
      'tab': '\t',
      'escape': '\x1b',
      // ...
    };
    return codes[key] || key;
  }
}
```

### WASM

```typescript
// packages/controller/src/adapters/wasm/wasm-adapter.ts
export class WasmAdapter implements PlatformAdapter {
  readonly platform = 'wasm';
  
  private instance: WebAssembly.Instance;
  private memory: WebAssembly.Memory;
  
  async initialize(config: WasmAdapterConfig): Promise<void> {
    this.instance = config.instance;
    this.memory = this.instance.exports.memory;
  }
  
  async executeKeyboard(action: KeyboardAction): Promise<void> {
    const keyCode = this.keyToWasmCode(action.key);
    const func = this.instance.exports.inject_keyboard;
    func(keyCode, action.type === 'press' ? 1 : 0);
  }
  
  async executeMouse(action: MouseAction): Promise<void> {
    const func = this.instance.exports.inject_mouse;
    func(action.x, action.y, action.button || 0, action.type === 'down' ? 1 : 0);
  }
}
```

---

## Middleware Pipeline

```typescript
// packages/controller/src/middleware/middleware.ts
export interface ControllerMiddleware {
  readonly name: string;
  readonly priority: number; // Lower = earlier
  
  process(action: ControllerAction, next: () => Promise<ActionResult>): Promise<ActionResult>;
}

// Built-in middleware
export const MIDDLEWARE: ControllerMiddleware[] = [
  {
    name: 'permissions',
    priority: 10,
    process: async (action, next) => {
      if (!await checkPermission(action.agentId, action.tool)) {
        throw new PermissionError(`Agent ${action.agentId} cannot use ${action.tool}`);
      }
      return next();
    },
  },
  {
    name: 'recording',
    priority: 20,
    process: async (action, next) => {
      const result = await next();
      await recordAction(action, result);
      return result;
    },
  },
  {
    name: 'replay',
    priority: 30,
    process: async (action, next) => {
      if (isReplaying()) {
        return getRecordedResult(action);
      }
      return next();
    },
  },
  {
    name: 'latency',
    priority: 40,
    process: async (action, next) => {
      const start = performance.now();
      const result = await next();
      recordLatency(action.tool, performance.now() - start);
      return result;
    },
  },
  {
    name: 'logging',
    priority: 50,
    process: async (action, next) => {
      logger.debug('Controller action', { agent: action.agentId, tool: action.tool, params: action.params });
      return next();
    },
  },
];
```

---

## Controller Manager

```typescript
// packages/sdk/src/managers/controller-manager.ts
export interface ControllerManager extends Manager<Controller, ControllerManifest, ControllerConfig> {
  readonly type: 'controller';
  readonly registry: ControllerRegistry;
  
  // Instance management
  createController(config: ControllerConfig): Promise<ControllerInstance>;
  getDeviceRegistry(): DeviceRegistry;
  getCapabilityRegistry(): CapabilityRegistry;
  getMcpServer(): McpServer;
}

export interface ControllerInstance {
  readonly id: ControllerInstanceId;
  readonly controller: Controller;
  readonly mcpSession: MCPSession;
  readonly devices: InputDevice[];
  
  connect(agentId: AgentId): Promise<void>;
  disconnect(): Promise<void>;
  execute(action: ControllerAction): Promise<ActionResult>;
}
```

---

## Capability Registry

```typescript
// packages/sdk/src/registries/capability-registry.ts
export interface CapabilityRegistry {
  register(capability: Capability): void;
  unregister(id: CapabilityId): void;
  get(id: CapabilityId): Capability | undefined;
  getAll(): Capability[];
  getForAgent(agentId: AgentId): Capability[];
  
  // Tier queries
  getSystemMandatory(): Capability[];
  getGameMandatory(gameId: GameId): Capability[];
  getSpecialSkills(gameId: GameId): Capability[];
}

export type CapabilityTier = 
  | 'system-mandatory'  // Always available: observe, communicate, pass, yield
  | 'game-mandatory'    // From arena manifest: move, attack
  | 'special-skill';    // Optional per agent: scan, shield, repair

export interface Capability {
  readonly id: CapabilityId;
  readonly name: string;
  readonly description: string;
  readonly tier: CapabilityTier;
  readonly gameId?: GameId;      // For game-mandatory/special-skill
  readonly mcpTool: McpToolDefinition;
  readonly permissions: string[];
  readonly toggleable: boolean;  // Can agent enable/disable?
  readonly defaultEnabled: boolean;
  readonly cost?: number;        // Action point cost
}
```

---

## Testing Controllers

```typescript
// packages/controller/tests/controller.test.ts
import { createTestController } from './test-utils';

describe('Controller', () => {
  let controller: TestController;
  
  beforeEach(() => {
    controller = createTestController({
      devices: ['keyboard', 'mouse'],
      platform: 'test', // In-memory mock
    });
  });
  
  it('executes keyboard actions', async () => {
    const result = await controller.execute({
      agentId: 'agent-1',
      tool: 'keyboard.press',
      params: { key: 'w' },
    });
    
    expect(result.success).toBe(true);
    expect(controller.mockPlatform.lastAction).toEqual({ type: 'keypress', key: 'w' });
  });
  
  it('executes mouse actions', async () => {
    await controller.execute({
      agentId: 'agent-1',
      tool: 'mouse.move',
      params: { x: 100, y: 200 },
    });
    
    expect(controller.mockPlatform.lastAction).toEqual({ 
      type: 'mousemove', 
      x: 100, 
      y: 200 
    });
  });
  
  it('enforces permissions', async () => {
    controller.setPermission('agent-1', 'keyboard.press', false);
    
    await expect(controller.execute({
      agentId: 'agent-1',
      tool: 'keyboard.press',
      params: { key: 'w' },
    })).rejects.toThrow(PermissionError);
  });
  
  it('records actions for replay', async () => {
    await controller.execute({ agentId: 'agent-1', tool: 'keyboard.press', params: { key: 'w' } });
    await controller.execute({ agentId: 'agent-1', tool: 'mouse.click', params: { button: 'left' } });
    
    const recording = controller.getRecording();
    expect(recording.actions).toHaveLength(2);
  });
  
  it('replays recorded actions', async () => {
    await controller.execute({ agentId: 'agent-1', tool: 'keyboard.press', params: { key: 'w' } });
    
    controller.enableReplay();
    const result = await controller.execute({ agentId: 'agent-1', tool: 'keyboard.press', params: { key: 'w' } });
    
    expect(result.replayed).toBe(true);
    expect(controller.mockPlatform.actionCount).toBe(1); // Original only
  });
});
```

---

## Forbidden Patterns

| Pattern | Forbidden | Alternative |
|---------|-----------|-------------|
| Direct game input | `game.input.keyDown('w')` | Controller → Platform Adapter → Game |
| AI reasoning in controller | `if (state.enemyNear) return 'attack'` | Agent Runtime decides, Controller executes |
| Platform-specific in core | `if (platform === 'win32') ...` | Platform Adapter pattern |
| Global device state | `global.keyboard = new Keyboard()` | Device Registry per controller instance |
| Sync input | `robot.keyTap('w')` in async fn | Async platform adapters |