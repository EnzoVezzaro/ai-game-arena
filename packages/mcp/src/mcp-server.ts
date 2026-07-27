import type { Logger } from '@ai-game-arena/sdk';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export interface McpToolHandler {
  (args: Record<string, unknown>): Promise<McpToolResult>;
}

interface McpToolEntry {
  description: string;
  inputSchema: Record<string, unknown>;
  handler: McpToolHandler;
}

export class McpServer {
  private tools = new Map<string, McpToolEntry>();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  registerTool(
    name: string,
    description: string,
    inputSchema: Record<string, unknown>,
    handler: McpToolHandler,
  ): void {
    this.tools.set(name, { description, inputSchema, handler });
    this.logger.info(`MCP tool registered: ${name}`, { component: 'mcp' });
  }

  registerTools(
    tools: Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
      handler: McpToolHandler;
    }>,
  ): void {
    for (const tool of tools) {
      this.registerTool(tool.name, tool.description, tool.inputSchema, tool.handler);
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    try {
      return await tool.handler(args);
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error calling ${name}: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }

  getToolDefinitions(): McpToolDefinition[] {
    return Array.from(this.tools.entries()).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

export interface McpToolHandler {
  (args: Record<string, unknown>): Promise<McpToolResult>;
}

export interface McpClient {
  listTools(): Promise<McpToolDefinition[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult>;
}

export class LocalMcpClient implements McpClient {
  private server: McpServer;

  constructor(server: McpServer) {
    this.server = server;
  }

  async listTools(): Promise<McpToolDefinition[]> {
    return this.server.getToolDefinitions();
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
    return this.server.callTool(name, args);
  }
}
