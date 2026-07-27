# Controller Development

> Building custom controllers, input devices, platform adapters, and middleware.

---

## Creating a Custom Controller

### Project Structure

```
my-controller/
├── arena-plugin.json
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Export default
│   ├── controller.ts         # Controller implementation
│   ├── devices/
│   │   ├── custom-device.ts
│   │   └── index.ts
│   ├── adapters/
│   │   ├── desktop/
│   │   ├── browser/
│   │   └── index.ts
│   ├── middleware/
│   │   └── custom-middleware.ts
│   └── mcp/
│       └── tools.ts
├── ui/                       # Frontend components (optional)
└── tests/
```

### Manifest

```json
{
  "id": "controller-vr",
  "name": "VR Controller",
  "version": "1.0.0",
  "type": "controller",
  "category": "controller",
  "description": "Virtual reality hand tracking controller",
  "engines": { "aga": "^1.0.0" },
  "entry": "./dist/index.js",
  "activation": { "startup": true },
  "contributions": {
    "controllers": ["controller-vr"],
    "capabilities": ["vr.point", "vr.grab", "vr.gesture", "vr.move"]
  },
  "dependencies": {
    "controller.basic": "^1.0.0"
  },
  "permissions": ["capability.controller", "system.events"]
}
```

### Controller Implementation

```typescript
// src/controller.ts
import { Controller, ControllerManifest, InputDevice, ControllerAction, ActionResult, Capability } from '@aga/sdk';

export class VRController implements Controller {
  readonly manifest: ControllerManifest = {
    id: 'controller-vr',
    name: 'VR Controller',
    version: '1.0.0',
    type: 'controller',
    devices: [
      { id: 'vr-hands', type: 'custom', capabilities: ['point', 'grab', 'gesture'], configSchema: VRHandConfigSchema },
      { id: 'vr-locomotion', type: 'custom', capabilities: ['move', 'turn'], configSchema: VRLocomotionConfigSchema },
    ],
    platformAdapters: [
      { platform: 'desktop', entry: './adapters/desktop/vr-adapter.js', capabilities: ['vr'] },
      { platform: 'browser', entry: './adapters/browser/vr-adapter.js', capabilities: ['vr'] },
    ],
    middleware: [
      { name: 'vr-permissions', type: 'permissions', config: {} },
      { name: 'vr-recording', type: 'recording', config: { format: 'vr' } },
    ],
  };

  private devices = new Map<string, InputDevice>();
  private platformAdapter: PlatformAdapter | null = null;
  private mcpServer: McpServer;
  private middleware: ControllerMiddleware[] = [];

  async initialize(): Promise<void> {
    // Register devices
    this.registerDevice(new VRHandDevice());
    this.registerDevice(new VRLocomotionDevice());
    
    // Load platform adapter
    this.platformAdapter = await this.loadPlatformAdapter();
    
    // Initialize middleware
    this.middleware = await this.loadMiddleware();
    
    // Setup MCP server with device tools
    this.setupMcpTools();
  }

  registerDevice(device: InputDevice): void {
    this.devices.set(device.id, device);
    // Auto-register MCP tools for device
    for (const tool of device.getMcpTools()) {
      this.mcpServer.registerTool(tool);
    }
  }

  getDevice(deviceId: string): InputDevice | undefined {
    return this.devices.get(deviceId);
  }

  getAllDevices(): InputDevice[] {
    return Array.from(this.devices.values());
  }

  getMcpServer(): McpServer {
    return this.mcpServer;
  }

  async connectAgent(agentId: AgentId, session: MCPSession): Promise<void> {
    // Filter capabilities for this agent
    const agentCapabilities = this.getCapabilitiesForAgent(agentId);
    const tools = agentCapabilities
      .filter(c => c.mcpTool)
      .map(c => c.mcpTool);
    
    await session.sendNotification({
      method: 'tools/list',
      params: { tools },
    });
  }

  async execute(action: ControllerAction): Promise<ActionResult> {
    // Run through middleware pipeline
    const pipeline = this.middleware
      .sort((a, b) => a.priority - b.priority)
      .reduceRight(
        (next, mw) => () => mw.process(action, next),
        async () => this.executeOnPlatform(action)
      );
    
    return pipeline();
  }

  private async executeOnPlatform(action: ControllerAction): Promise<ActionResult> {
    if (!this.platformAdapter) {
      return { success: false, error: 'No platform adapter' };
    }

    try {
      const device = this.devices.get(action.tool.split('.')[0]);
      if (!device) {
        return { success: false, error: `Unknown device: ${action.tool}` };
      }

      await device.execute(action);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  getCapabilities(): Capability[] {
    const caps: Capability[] = [];
    for (const device of this.devices.values()) {
      caps.push(...device.getCapabilities());
    }
    return caps;
  }

  getCapabilitiesForAgent(agentId: AgentId): Capability[] {
    // Filter based on agent profile, arena, etc.
    return this.getCapabilities().filter(c => c.defaultEnabled || c.toggleable);
  }

  async shutdown(): Promise<void> {
    for (const device of this.devices.values()) {
      await device.shutdown?.();
    }
    await this.platformAdapter?.shutdown?.();
  }
}
```

---

## Creating a Custom Input Device

### Base Interface

```typescript
// src/devices/custom-device.ts
import { InputDevice, ControllerAction, ActionResult, Capability, McpTool } from '@aga/sdk';

export interface InputDevice {
  readonly id: string;
  readonly type: DeviceType;
  readonly capabilities: string[];
  
  getMcpTools(): McpTool[];
  getCapabilities(): Capability[];
  execute(action: ControllerAction): Promise<ActionResult>;
  shutdown?(): Promise<void>;
}
```

### VR Hand Device Example

```typescript
// src/devices/vr-hand-device.ts
export class VRHandDevice implements InputDevice {
  readonly id = 'vr-hands';
  readonly type = 'custom' as DeviceType;
  readonly capabilities = ['point', 'grab', 'gesture', 'pinch', 'rotate'];

  private leftHand: HandState = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, pinch: false, grab: false };
  private rightHand: HandState = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, pinch: false, grab: false };

  getMcpTools(): McpTool[] {
    return [
      {
        name: 'vr.point',
        description: 'Point at a position in 3D space',
        inputSchema: {
          type: 'object',
          properties: {
            hand: { type: 'string', enum: ['left', 'right'] },
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' },
            duration: { type: 'number', default: 100 },
          },
          required: ['hand', 'x', 'y', 'z'],
        },
      },
      {
        name: 'vr.grab',
        description: 'Grab or release an object',
        inputSchema: {
          type: 'object',
          properties: {
            hand: { type: 'string', enum: ['left', 'right'] },
            action: { type: 'string', enum: ['grab', 'release'] },
            targetId: { type: 'string' },
          },
          required: ['hand', 'action'],
        },
      },
      {
        name: 'vr.gesture',
        description: 'Perform a hand gesture',
        inputSchema: {
          type: 'object',
          properties: {
            hand: { type: 'string', enum: ['left', 'right'] },
            gesture: { type: 'string', enum: ['pinch', 'fist', 'open', 'thumbs_up', 'peace', 'point'] },
            duration: { type: 'number', default: 500 },
          },
          required: ['hand', 'gesture'],
        },
      },
      {
        name: 'vr.move_hand',
        description: 'Move hand to position with rotation',
        inputSchema: {
          type: 'object',
          properties: {
            hand: { type: 'string', enum: ['left', 'right'] },
            position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } } },
            rotation: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } } },
            duration: { type: 'number', default: 200 },
          },
          required: ['hand', 'position'],
        },
      },
    ];
  }

  getCapabilities(): Capability[] {
    return [
      { id: 'vr.point', name: 'Point', tier: 'special-skill', mcpTool: 'vr.point', toggleable: true, defaultEnabled: true },
      { id: 'vr.grab', name: 'Grab', tier: 'special-skill', mcpTool: 'vr.grab', toggleable: true, defaultEnabled: true },
      { id: 'vr.gesture', name: 'Gesture', tier: 'special-skill', mcpTool: 'vr.gesture', toggleable: true, defaultEnabled: true },
    ];
  }

  async execute(action: ControllerAction): Promise<ActionResult> {
    const { tool, params } = action;
    
    try {
      switch (tool) {
        case 'vr.point':
          await this.point(params.hand, params.x, params.y, params.z, params.duration);
          break;
        case 'vr.grab':
          await this.grab(params.hand, params.action, params.targetId);
          break;
        case 'vr.gesture':
          await this.gesture(params.hand, params.gesture, params.duration);
          break;
        case 'vr.move_hand':
          await this.moveHand(params.hand, params.position, params.rotation, params.duration);
          break;
        default:
          return { success: false, error: `Unknown action: ${tool}` };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async point(hand: 'left' | 'right', x: number, y: number, z: number, duration: number): Promise<void> {
    const handState = hand === 'left' ? this.leftHand : this.rightHand;
    // Animate to position
    await this.animateHand(handState, { x, y, z }, duration);
    // Platform adapter handles actual input injection
  }

  private async grab(hand: 'left' | 'right', action: 'grab' | 'release', targetId?: string): Promise<void> {
    const handState = hand === 'left' ? this.leftHand : this.rightHand;
    handState.grab = action === 'grab';
    // Send grab/release to platform
  }

  private async gesture(hand: 'left' | 'right', gesture: string, duration: number): Promise<void> {
    // Map gesture to hand pose
    const poses: Record<string, HandPose> = {
      pinch: { fingers: [1, 0, 0, 0, 0] },  // index only
      fist: { fingers: [1, 1, 1, 1, 1] },
      open: { fingers: [0, 0, 0, 0, 0] },
      thumbs_up: { fingers: [0, 0, 0, 0, 1] },
      peace: { fingers: [0, 1, 1, 0, 0] },
      point: { fingers: [1, 0, 0, 0, 0] },
    };
    await this.setHandPose(hand, poses[gesture], duration);
  }

  private async moveHand(
    hand: 'left' | 'right', 
    position: { x: number; y: number; z: number }, 
    rotation?: { x: number; y: number; z: number },
    duration = 200
  ): Promise<void> {
    const handState = hand === 'left' ? this.leftHand : this.rightHand;
    await this.animateHand(handState, position, duration);
    if (rotation) handState.rotation = rotation;
  }

  private async animateHand(handState: HandState, target: { x: number; y: number; z: number }, duration: number): Promise<void> {
    // Platform adapter handles interpolation and injection
  }

  private async setHandPose(hand: 'left' | 'right', pose: HandPose, duration: number): Promise<void> {
    // Platform adapter handles pose
  }
}

interface HandState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  pinch: boolean;
  grab: boolean;
}

interface HandPose {
  fingers: number[]; // 0=extended, 1=curled
}
```

---

## Creating a Platform Adapter

### Interface

```typescript
// packages/sdk/src/contracts/controller.ts
export interface PlatformAdapter {
  readonly platform: Platform;
  readonly supportedDevices: DeviceType[];
  
  initialize(config: PlatformAdapterConfig): Promise<void>;
  executeKeyboard(action: KeyboardAction): Promise<void>;
  executeMouse(action: MouseAction): Promise<void>;
  executePointer(action: PointerAction): Promise<void>;
  executeTouch(action: TouchAction): Promise<void>;
  executeGamepad(action: GamepadAction): Promise<void>;
  executeWheel(action: WheelAction): Promise<void>;
  executePen(action: PenAction): Promise<void>;
  executeCustom(deviceId: string, action: CustomAction): Promise<void>;
  shutdown(): Promise<void>;
}

export type Platform = 'desktop' | 'browser' | 'terminal' | 'wasm' | 'remote' | 'vr';
```

### VR Desktop Adapter (using WebXR/OpenXR)

```typescript
// src/adapters/desktop/vr-adapter.ts
export class VRDesktopAdapter implements PlatformAdapter {
  readonly platform = 'desktop' as Platform;
  readonly supportedDevices = ['custom' as DeviceType];
  
  private xrSession: XRSession | null = null;
  private inputSources: XRInputSource[] = [];

  async initialize(config: VRAdapterConfig): Promise<void> {
    // Check WebXR support
    if (!navigator.xr) {
      throw new Error('WebXR not supported');
    }
    
    // Request session
    this.xrSession = await navigator.xr.requestSession('immersive-vr', {
      requiredFeatures: ['local-floor', 'hand-tracking'],
      optionalFeatures: ['eye-tracking', 'hit-test'],
    });
    
    this.xrSession.addEventListener('inputsourceschange', (event) => {
      this.inputSources = Array.from(this.xrSession!.inputSources);
    });
  }

  async executeCustom(deviceId: string, action: CustomAction): Promise<void> {
    if (!this.xrSession) throw new Error('XR session not initialized');
    
    const { tool, params } = action;
    
    switch (deviceId) {
      case 'vr-hands':
        await this.executeHandAction(tool, params);
        break;
      case 'vr-locomotion':
        await this.executeLocomotionAction(tool, params);
        break;
    }
  }

  private async executeHandAction(tool: string, params: any): Promise<void> {
    const hand = params.hand === 'left' ? 'left' : 'right';
    const inputSource = this.inputSources.find(s => s.handedness === hand);
    
    if (!inputSource || !inputSource.hand) return;
    
    switch (tool) {
      case 'vr.point':
        // Hand tracking provides joint positions automatically
        // Just need to ensure we're tracking
        break;
      case 'vr.grab':
        // Simulate grab via pinch gesture
        if (params.action === 'grab') {
          await this.simulatePinch(inputSource, true);
        } else {
          await this.simulatePinch(inputSource, false);
        }
        break;
      case 'vr.gesture':
        await this.simulateGesture(inputSource, params.gesture, params.duration);
        break;
      case 'vr.move_hand':
        // Hand position is tracked by XR, this would be for programmatic movement
        break;
    }
  }

  private async simulatePinch(source: XRInputSource, pinch: boolean): Promise<void> {
    // Inject pinch state into hand tracking
    // This is platform-specific - might use gamepad emulation
  }

  private async simulateGesture(source: XRInputSource, gesture: string, duration: number): Promise<void> {
    // Map gesture to joint poses and animate
  }

  async shutdown(): Promise<void> {
    if (this.xrSession) {
      await this.xrSession.end();
      this.xrSession = null;
    }
  }
}
```

### Browser Adapter (WebXR)

```typescript
// src/adapters/browser/vr-adapter.ts
export class VRBrowserAdapter implements PlatformAdapter {
  readonly platform = 'browser' as Platform;
  readonly supportedDevices = ['custom' as DeviceType];
  
  private page: Page;
  private cdp: CDPSession;

  async initialize(config: BrowserAdapterConfig): Promise<void> {
    this.page = config.page;
    this.cdp = await this.page.context().newCDPSession(this.page);
    
    // Enable WebXR in browser
    await this.cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false });
    await this.page.addInitScript(() => {
      navigator.xr.requestSession = navigator.xr.requestSession || (async () => {
        // Mock for testing
        return { end: async () => {}, addEventListener: () => {}, inputSources: [] };
      });
    });
  }

  async executeCustom(deviceId: string, action: CustomAction): Promise<void> {
    // Execute via CDP injection
    await this.page.evaluate(
      ({ deviceId, tool, params }) => {
        // Call into page's VR controller
        (window as any).vrController?.execute(deviceId, tool, params);
      },
      { deviceId, tool: action.tool, params: action.params }
    );
  }

  async shutdown(): Promise<void> {
    await this.page.evaluate(() => (window as any).vrController?.shutdown?.());
  }
}
```

---

## Creating Middleware

```typescript
// src/middleware/custom-middleware.ts
import { ControllerMiddleware, ControllerAction, ActionResult } from '@aga/sdk';

export class RateLimitMiddleware implements ControllerMiddleware {
  readonly name = 'rate-limit';
  readonly priority = 15;
  
  private requestCounts = new Map<string, number[]>();
  private readonly maxRequests = 60;
  private readonly windowMs = 1000;

  async process(action: ControllerAction, next: () => Promise<ActionResult>): Promise<ActionResult> {
    const key = `${action.agentId}:${action.tool}`;
    const now = Date.now();
    
    // Clean old entries
    const requests = (this.requestCounts.get(key) || []).filter(t => now - t < this.windowMs);
    
    if (requests.length >= this.maxRequests) {
      return { 
        success: false, 
        error: `Rate limit exceeded for ${action.tool}. Max ${this.maxRequests} requests per second.` 
      };
    }
    
    requests.push(now);
    this.requestCounts.set(key, requests);
    
    return next();
  }
}

export class ActionValidationMiddleware implements ControllerMiddleware {
  readonly name = 'action-validation';
  readonly priority = 5;
  
  private validators = new Map<string, (params: any) => boolean>();

  addValidator(tool: string, validator: (params: any) => boolean): void {
    this.validators.set(tool, validator);
  }

  async process(action: ControllerAction, next: () => Promise<ActionResult>): Promise<ActionResult> {
    const validator = this.validators.get(action.tool);
    
    if (validator && !validator(action.params)) {
      return { success: false, error: `Invalid parameters for ${action.tool}` };
    }
    
    return next();
  }
}

export class CooldownMiddleware implements ControllerMiddleware {
  readonly name = 'cooldown';
  readonly priority = 25;
  
  private cooldowns = new Map<string, Map<string, number>>(); // agentId -> tool -> nextAllowedTime
  private cooldownConfig = new Map<string, number>(); // tool -> cooldownMs

  setCooldown(tool: string, cooldownMs: number): void {
    this.cooldownConfig.set(tool, cooldownMs);
  }

  async process(action: ControllerAction, next: () => Promise<ActionResult>): Promise<ActionResult> {
    const cooldown = this.cooldownConfig.get(action.tool);
    if (!cooldown) return next();

    const agentCooldowns = this.cooldowns.get(action.agentId) || new Map();
    const nextAllowed = agentCooldowns.get(action.tool) || 0;
    const now = Date.now();

    if (now < nextAllowed) {
      return { 
        success: false, 
        error: `${action.tool} on cooldown. Available in ${nextAllowed - now}ms.` 
      };
    }

    agentCooldowns.set(action.tool, now + cooldown);
    this.cooldowns.set(action.agentId, agentCooldowns);

    return next();
  }
}
```

---

## Registering Controller

```typescript
// src/index.ts
import { VRController } from './controller';
import { RateLimitMiddleware, ActionValidationMiddleware, CooldownMiddleware } from './middleware/custom-middleware';

const controller = new VRController();

// Configure middleware
controller.addMiddleware(new ActionValidationMiddleware());
controller.addMiddleware(new RateLimitMiddleware());
controller.addMiddleware(new CooldownMiddleware());

// Configure cooldowns
controller.getMiddleware(CooldownMiddleware)?.setCooldown('vr.grab', 500);
controller.getMiddleware(CooldownMiddleware)?.setCooldown('vr.gesture', 1000);

// Add custom validators
controller.getMiddleware(ActionValidationMiddleware)?.addValidator('vr.point', (params) => {
  return typeof params.x === 'number' && typeof params.y === 'number' && typeof params.z === 'number';
});

export default controller;
```

---

## Testing Custom Controller

```typescript
// tests/controller.test.ts
import { createTestController } from '@aga/testing';
import VRController from '../src/controller';

describe('VRController', () => {
  let controller: VRController;
  let mockPlatform: MockVRPlatform;

  beforeEach(() => {
    mockPlatform = new MockVRPlatform();
    controller = new VRController();
    controller.setPlatformAdapter(mockPlatform);
  });

  it('registers VR hand device', () => {
    const device = controller.getDevice('vr-hands');
    expect(device).toBeDefined();
    expect(device.capabilities).toContain('point');
    expect(device.capabilities).toContain('grab');
  });

  it('executes point action', async () => {
    const result = await controller.execute({
      agentId: 'agent-1',
      tool: 'vr.point',
      params: { hand: 'right', x: 1, y: 2, z: 3 },
    });

    expect(result.success).toBe(true);
    expect(mockPlatform.lastHandAction).toEqual({
      hand: 'right',
      action: 'point',
      position: { x: 1, y: 2, z: 3 },
    });
  });

  it('executes grab action', async () => {
    await controller.execute({
      agentId: 'agent-1',
      tool: 'vr.grab',
      params: { hand: 'left', action: 'grab', targetId: 'object-1' },
    });

    expect(mockPlatform.lastHandAction).toEqual({
      hand: 'left',
      action: 'grab',
      targetId: 'object-1',
    });
  });

  it('enforces rate limiting', async () => {
    // Execute 60 times rapidly
    for (let i = 0; i < 60; i++) {
      await controller.execute({ agentId: 'agent-1', tool: 'vr.point', params: { hand: 'right', x: 0, y: 0, z: 0 } });
    }

    // 61st should fail
    const result = await controller.execute({ agentId: 'agent-1', tool: 'vr.point', params: { hand: 'right', x: 0, y: 0, z: 0 } });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Rate limit');
  });

  it('provides MCP tools', () => {
    const tools = controller.getMcpServer().tools;
    expect(tools.has('vr.point')).toBe(true);
    expect(tools.has('vr.grab')).toBe(true);
    expect(tools.has('vr.gesture')).toBe(true);
    expect(tools.has('vr.move_hand')).toBe(true);
  });

  it('filters capabilities for agent', () => {
    const caps = controller.getCapabilitiesForAgent('agent-1');
    expect(caps.map(c => c.id)).toContain('vr.point');
    expect(caps.map(c => c.id)).toContain('vr.grab');
  });
});
```

---

## Configuration Schema

```typescript
// src/config.ts
import { z } from 'zod';

export const VRControllerConfigSchema = z.object({
  // Hand tracking
  handTracking: z.object({
    enabled: z.boolean().default(true),
    updateRate: z.number().default(90), // Hz
    smoothing: z.number().min(0).max(1).default(0.1),
  }).default({}),

  // Locomotion
  locomotion: z.object({
    type: z.enum(['teleport', 'smooth', 'snap-turn']).default('teleport'),
    speed: z.number().default(1.0),
    turnSpeed: z.number().default(45), // degrees/sec
  }).default({}),

  // Haptics
  haptics: z.object({
    enabled: z.boolean().default(true),
    intensity: z.number().min(0).max(1).default(0.5),
  }).default({}),

  // Safety
  safety: z.object({
    boundaryEnabled: z.boolean().default(true),
    boundaryColor: z.string().default('#ff0000'),
  }).default({}),
});

export type VRControllerConfig = z.infer<typeof VRControllerConfigSchema>;
```

---

## Publishing

```bash
# Build
npm run build

# Test
npm test

# Publish
npm publish --access public

# Users install
aga controller install @my-org/aga-controller-vr
```