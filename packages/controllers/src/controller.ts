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
    // No default devices — adapters register only the tools needed for their game.
  }

  registerTool(
    name: string,
    description: string,
    inputSchema: Record<string, unknown>,
    handler: (
      args: Record<string, unknown>,
    ) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>,
  ): void {
    this.mcpServer.registerTool(name, description, inputSchema, async (args) => {
      this.recordAction({ device: 'game', action: name, parameters: args, timestamp: Date.now() });
      return handler(args);
    });
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
