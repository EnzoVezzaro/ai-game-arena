import type {
  Logger,
  AgentConfig,
  AgentAction,
  AgentMemory,
  MemoryEntry,
} from '@ai-game-arena/sdk';
import type { Observation as ObservationType } from '@ai-game-arena/sdk';
import { LocalMcpClient } from '@ai-game-arena/mcp';
import type { McpClient, McpToolResult } from '@ai-game-arena/mcp';
import type { Controller } from '@ai-game-arena/controller';

export interface AgentRuntimeOptions {
  logger: Logger;
}

export class AgentRuntime {
  private logger: Logger;
  private agent: AgentConfig | null = null;
  private mcpClient: McpClient | null = null;
  private memory: AgentMemory = {
    shortTerm: [],
    longTerm: [],
    social: [],
    strategic: [],
  };
  private lastObservation: ObservationType | null = null;

  constructor(options: AgentRuntimeOptions) {
    this.logger = options.logger;
  }

  async initialize(agent: AgentConfig): Promise<void> {
    this.agent = agent;
    this.logger.info(`Initialized agent: ${agent.name} (${agent.id})`, {
      component: 'agent-runtime',
      agentId: agent.id,
    });
  }

  async connectToController(controller: Controller): Promise<void> {
    this.mcpClient = new LocalMcpClient(controller.getMcpServer());
    this.logger.info(`Agent connected to controller`, {
      component: 'agent-runtime',
      agentId: this.agent?.id,
    });
  }

  async observe(observation: ObservationType): Promise<void> {
    this.lastObservation = observation;

    // Store in short-term memory
    const memoryEntry: MemoryEntry = {
      id: `obs-${Date.now()}`,
      content: JSON.stringify(observation.data),
      timestamp: observation.timestamp,
      importance: 0.5,
      tags: ['observation', observation.type],
    };

    this.memory.shortTerm.push(memoryEntry);

    // Keep short-term memory bounded
    if (this.memory.shortTerm.length > 100) {
      const trimmed = this.memory.shortTerm.slice(-50);
      this.memory = { ...this.memory, shortTerm: trimmed };
    }
  }

  async decide(): Promise<AgentAction> {
    if (!this.mcpClient) {
      throw new Error('Agent not connected to controller');
    }

    // List available tools
    const tools = await this.mcpClient.listTools();
    const toolNames = tools.map((t) => t.name);

    // Simple decision logic - in real implementation, this would call an LLM
    const action = this.createDefaultDecision(toolNames);

    return action;
  }

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<McpToolResult> {
    if (!this.mcpClient) {
      throw new Error('Agent not connected to controller');
    }

    return this.mcpClient.callTool(toolName, args);
  }

  async communicate(message: string, _to: string = 'all'): Promise<void> {
    if (!this.mcpClient) {
      throw new Error('Agent not connected to controller');
    }

    // Store in social memory
    const memoryEntry: MemoryEntry = {
      id: `msg-${Date.now()}`,
      content: message,
      timestamp: Date.now(),
      importance: 0.3,
      tags: ['communication', 'outbound'],
    };

    this.memory.social.push(memoryEntry);
  }

  getMemory(): AgentMemory {
    return {
      shortTerm: [...this.memory.shortTerm],
      longTerm: [...this.memory.longTerm],
      social: [...this.memory.social],
      strategic: [...this.memory.strategic],
    };
  }

  getAgent(): AgentConfig | null {
    return this.agent;
  }

  getLastObservation(): ObservationType | null {
    return this.lastObservation;
  }

  private createDefaultDecision(availableTools: string[]): AgentAction {
    const agentId = this.agent?.id ?? 'unknown';
    // Default: pass if available, otherwise first tool
    const passTool = availableTools.find((t) => t === 'pass');
    if (passTool) {
      return {
        agentId,
        type: 'pass',
        parameters: {},
        timestamp: Date.now(),
      };
    }

    return {
      agentId,
      type: availableTools[0] ?? 'pass',
      parameters: {},
      timestamp: Date.now(),
    };
  }

  async shutdown(): Promise<void> {
    this.mcpClient = null;
    this.agent = null;
    this.memory = { shortTerm: [], longTerm: [], social: [], strategic: [] };
  }
}
