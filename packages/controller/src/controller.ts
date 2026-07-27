import { McpServer } from '@ai-game-arena/mcp';
import type { Capability, ParameterDefinition, Logger, Controller as ControllerInterface } from '@ai-game-arena/sdk';

export interface InputAction {
  device: string;
  action: string;
  parameters: Record<string, unknown>;
  timestamp: number;
}

export interface ControllerOptions {
  id?: string;
  name?: string;
}

function createNoopLogger(): Logger {
  const noop = () => {};
  const noopLogger: Logger = {
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    child: () => noopLogger,
  };
  return noopLogger;
}

export class Controller implements ControllerInterface {
  readonly id: string;
  readonly name: string;
  private mcpServer: McpServer;
  private inputHistory: InputAction[] = [];
  private actionCallback: ((action: InputAction) => void) | null = null;

  constructor(options: ControllerOptions = {}) {
    this.id = options.id ?? `controller-${Date.now()}`;
    this.name = options.name ?? 'Default Controller';
    this.mcpServer = new McpServer(createNoopLogger());

    this.registerDefaultDevices();
  }

  private registerDefaultDevices(): void {
    // Keyboard device
    this.mcpServer.registerTool(
      'keyboard.press',
      'Press a keyboard key',
      { key: { type: 'string', description: 'Key to press' } },
      async (args) => {
        const action: InputAction = {
          device: 'keyboard',
          action: 'press',
          parameters: args,
          timestamp: Date.now(),
        };
        this.recordAction(action);
        return { content: [{ type: 'text', text: `Pressed key: ${args.key}` }] };
      },
    );

    this.mcpServer.registerTool(
      'keyboard.release',
      'Release a keyboard key',
      { key: { type: 'string', description: 'Key to release' } },
      async (args) => {
        const action: InputAction = {
          device: 'keyboard',
          action: 'release',
          parameters: args,
          timestamp: Date.now(),
        };
        this.recordAction(action);
        return { content: [{ type: 'text', text: `Released key: ${args.key}` }] };
      },
    );

    this.mcpServer.registerTool(
      'keyboard.type',
      'Type a string of text',
      { text: { type: 'string', description: 'Text to type' } },
      async (args) => {
        const action: InputAction = {
          device: 'keyboard',
          action: 'type',
          parameters: args,
          timestamp: Date.now(),
        };
        this.recordAction(action);
        return { content: [{ type: 'text', text: `Typed: ${args.text}` }] };
      },
    );

    // Mouse device
    this.mcpServer.registerTool(
      'mouse.move',
      'Move the mouse cursor',
      {
        x: { type: 'number', description: 'X position' },
        y: { type: 'number', description: 'Y position' },
      },
      async (args) => {
        const action: InputAction = {
          device: 'mouse',
          action: 'move',
          parameters: args,
          timestamp: Date.now(),
        };
        this.recordAction(action);
        return { content: [{ type: 'text', text: `Mouse moved to (${args.x}, ${args.y})` }] };
      },
    );

    this.mcpServer.registerTool(
      'mouse.click',
      'Click the mouse',
      { button: { type: 'string', description: 'Button to click (left, right, middle)' } },
      async (args) => {
        const action: InputAction = {
          device: 'mouse',
          action: 'click',
          parameters: args,
          timestamp: Date.now(),
        };
        this.recordAction(action);
        return {
          content: [{ type: 'text', text: `Clicked ${args.button ?? 'left'} mouse button` }],
        };
      },
    );

    this.mcpServer.registerTool(
      'mouse.scroll',
      'Scroll the mouse wheel',
      { delta: { type: 'number', description: 'Scroll delta' } },
      async (args) => {
        const action: InputAction = {
          device: 'mouse',
          action: 'scroll',
          parameters: args,
          timestamp: Date.now(),
        };
        this.recordAction(action);
        return { content: [{ type: 'text', text: `Scrolled: ${args.delta}` }] };
      },
    );

    // Gamepad device
    this.mcpServer.registerTool(
      'gamepad.press',
      'Press a gamepad button',
      { button: { type: 'string', description: 'Button to press' } },
      async (args) => {
        const action: InputAction = {
          device: 'gamepad',
          action: 'press',
          parameters: args,
          timestamp: Date.now(),
        };
        this.recordAction(action);
        return { content: [{ type: 'text', text: `Pressed gamepad button: ${args.button}` }] };
      },
    );

    this.mcpServer.registerTool(
      'gamepad.moveStick',
      'Move a gamepad analog stick',
      {
        stick: { type: 'string', description: 'Stick to move (left, right)' },
        x: { type: 'number', description: 'X axis value (-1 to 1)' },
        y: { type: 'number', description: 'Y axis value (-1 to 1)' },
      },
      async (args) => {
        const action: InputAction = {
          device: 'gamepad',
          action: 'moveStick',
          parameters: args,
          timestamp: Date.now(),
        };
        this.recordAction(action);
        return {
          content: [{ type: 'text', text: `Moved ${args.stick} stick to (${args.x}, ${args.y})` }],
        };
      },
    );

    // Pass (do nothing)
    this.mcpServer.registerTool('pass', 'Skip this turn, take no action', {}, async () => {
      const action: InputAction = {
        device: 'system',
        action: 'pass',
        parameters: {},
        timestamp: Date.now(),
      };
      this.recordAction(action);
      return { content: [{ type: 'text', text: 'Passed turn' }] };
    });

    // Yield (forfeit)
    this.mcpServer.registerTool(
      'yield',
      'Forfeit or surrender the match',
      { reason: { type: 'string', description: 'Reason for surrender', required: false } },
      async (args) => {
        const action: InputAction = {
          device: 'system',
          action: 'yield',
          parameters: args,
          timestamp: Date.now(),
        };
        this.recordAction(action);
        return {
          content: [{ type: 'text', text: `Yielded: ${args.reason ?? 'No reason provided'}` }],
        };
      },
    );
  }

  registerTool(
    name: string,
    description: string,
    inputSchema: Record<string, unknown>,
    handler: (
      args: Record<string, unknown>,
    ) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>,
  ): void {
    this.mcpServer.registerTool(name, description, inputSchema, handler);
  }

  onAction(callback: (action: InputAction) => void): void {
    this.actionCallback = callback;
  }

  private recordAction(action: InputAction): void {
    this.inputHistory.push(action);
    this.actionCallback?.(action);
  }

  getInputHistory(): InputAction[] {
    return [...this.inputHistory];
  }

  getMcpServer(): McpServer {
    return this.mcpServer;
  }

  getCapabilities(): Capability[] {
    return this.mcpServer.getToolDefinitions().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: {} as Record<string, ParameterDefinition>,
      mandatory: false,
    }));
  }

  clearHistory(): void {
    this.inputHistory = [];
  }
}
