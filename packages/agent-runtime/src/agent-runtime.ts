import type {
  Logger,
  AgentConfig,
  AgentAction,
  AgentMemory,
  MemoryEntry,
} from '@ai-game-arena/sdk';
import type { Observation as ObservationType } from '@ai-game-arena/sdk';
import { LocalMcpClient } from '@ai-game-arena/mcp';
import type { McpClient, McpToolResult, McpServer } from '@ai-game-arena/mcp';
import type { Controller } from '@ai-game-arena/sdk';
import type { LLMProvider } from './providers/llm-provider';
import { createProvider } from './providers/provider-factory';

export interface AgentRuntimeOptions {
  logger: Logger;
  provider?: LLMProvider;
}

export class AgentRuntime {
  private logger: Logger;
  private agent: AgentConfig | null = null;
  private mcpClient: McpClient | null = null;
  private llmProvider: LLMProvider | null = null;
  private memory: AgentMemory = {
    shortTerm: [],
    longTerm: [],
    social: [],
    strategic: [],
  };
  private lastObservation: ObservationType | null = null;
  private decisionHistory: Array<{ role: 'user' | 'assistant' | 'tool'; content: string }> = [];

  constructor(options: AgentRuntimeOptions) {
    this.logger = options.logger;
  }

  async initialize(agent: AgentConfig): Promise<void> {
    this.agent = agent;

    if (agent.provider) {
      this.llmProvider = createProvider(agent.provider);
    }

    this.logger.info(`Initialized agent: ${agent.name} (${agent.id}) with provider: ${this.llmProvider?.type ?? 'none'}`, {
      component: 'agent-runtime',
      agentId: agent.id,
    });
  }

  async connectToController(controller: Controller): Promise<void> {
    this.mcpClient = new LocalMcpClient(controller.getMcpServer() as McpServer);
    this.logger.info(`Agent connected to controller`, {
      component: 'agent-runtime',
      agentId: this.agent?.id,
    });
  }

  async observe(observation: ObservationType): Promise<void> {
    this.lastObservation = observation;

    const memoryEntry: MemoryEntry = {
      id: `obs-${Date.now()}`,
      content: JSON.stringify(observation.data),
      timestamp: observation.timestamp,
      importance: 0.5,
      tags: ['observation', observation.type],
    };

    this.memory.shortTerm.push(memoryEntry);

    if (this.memory.shortTerm.length > 100) {
      const trimmed = this.memory.shortTerm.slice(-50);
      this.memory = { ...this.memory, shortTerm: trimmed };
    }
  }

  async decide(): Promise<AgentAction> {
    if (!this.mcpClient) {
      throw new Error('Agent not connected to controller');
    }

    const tools = await this.mcpClient.listTools();
    const observationText = this.lastObservation
      ? JSON.stringify(this.lastObservation.data)
      : 'No observation available';

    if (!this.llmProvider) {
      throw new Error(
        `Agent ${this.agent?.name ?? 'unknown'} has no LLM provider configured`,
      );
    }

    const response = await this.llmProvider.decide(
      this.agent!,
      observationText,
      tools,
      this.decisionHistory,
    );

    if (response.toolCalls && response.toolCalls.length > 0) {
      const toolCall = response.toolCalls[0];
      if (!toolCall) {
        throw new Error('Provider returned empty tool call');
      }

      try {
        const result = await this.mcpClient.callTool(toolCall.name, toolCall.parameters);

        this.decisionHistory.push({
          role: 'assistant',
          content: `Called ${toolCall.name}(${JSON.stringify(toolCall.parameters)}) → ${JSON.stringify(result.content)}`,
        });

        return {
          agentId: this.agent?.id ?? 'unknown',
          type: toolCall.name,
          parameters: toolCall.parameters,
          timestamp: Date.now(),
        };
      } catch (err) {
        this.logger.error(`Tool execution failed: ${toolCall.name}`, {
          component: 'agent-runtime',
          agentId: this.agent?.id,
        });
        throw err;
      }
    }

    this.decisionHistory.push({ role: 'assistant', content: response.content });

    throw new Error('No tool calls returned and no text response');
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

  async shutdown(): Promise<void> {
    if (this.llmProvider) {
      await this.llmProvider.shutdown();
    }
    this.mcpClient = null;
    this.agent = null;
    this.memory = { shortTerm: [], longTerm: [], social: [], strategic: [] };
    this.decisionHistory = [];
  }
}