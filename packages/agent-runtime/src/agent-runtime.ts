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
  /**
   * Tool names that are free "looks" (e.g. scan): they return game state to
   * the agent and do NOT consume the turn. The agent may call them before
   * taking its real action. Defaults to ['scan'].
   */
  lookTools?: string[];
  /** Max LLM rounds allowed for look-ahead before the agent must act. Default 4. */
  maxLookTurns?: number;
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
  private readonly lookTools: Set<string>;
  private readonly maxLookTurns: number;
  private readonly injectedProvider: LLMProvider | null;

  constructor(options: AgentRuntimeOptions) {
    this.logger = options.logger;
    this.lookTools = new Set(options.lookTools ?? ['scan']);
    this.maxLookTurns = options.maxLookTurns ?? 4;
    this.injectedProvider = options.provider ?? null;
  }

  async initialize(agent: AgentConfig): Promise<void> {
    this.agent = agent;

    // Prefer an explicitly injected provider (tests/host wiring); otherwise
    // build one from the agent's provider config.
    this.llmProvider = this.injectedProvider ?? (agent.provider ? createProvider(agent.provider) : null);

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
    if (!this.llmProvider) {
      throw new Error(
        `Agent ${this.agent?.name ?? 'unknown'} has no LLM provider configured`,
      );
    }

    const tools = await this.mcpClient.listTools();
    const observationText = this.lastObservation
      ? JSON.stringify(this.lastObservation.data)
      : 'No observation available';

    // The agent may call "look" tools (e.g. scan) to see the board BEFORE
    // playing; those do not consume the turn. We loop, feeding each look
    // result back, until the agent takes its actual turn action (or we hit
    // the cap and fall back to pass).
    const passAction = (): AgentAction => ({
      agentId: this.agent?.id ?? 'unknown',
      type: 'pass',
      parameters: {},
      timestamp: Date.now(),
    });

    for (let round = 0; round < this.maxLookTurns; round++) {
      const response = await this.llmProvider.decide(
        this.agent!,
        observationText,
        tools,
        this.decisionHistory,
      );

      const toolCalls = response.toolCalls ?? [];
      if (toolCalls.length === 0) {
        this.decisionHistory.push({ role: 'assistant', content: response.content });
        return passAction();
      }

      for (const toolCall of toolCalls) {
        if (!toolCall) continue;

        const result = await this.mcpClient.callTool(toolCall.name, toolCall.parameters);
        this.decisionHistory.push({
          role: 'assistant',
          content: `Called ${toolCall.name}(${JSON.stringify(toolCall.parameters)}) → ${JSON.stringify(result.content)}`,
        });

        // Free look (scan): the result is in history so the model can now
        // decide its real action. Not a turn action.
        if (this.lookTools.has(toolCall.name)) continue;

        // Final turn action.
        return {
          agentId: this.agent?.id ?? 'unknown',
          type: toolCall.name,
          parameters: toolCall.parameters,
          timestamp: Date.now(),
        };
      }
    }

    // Only look calls were made within the cap — do not waste the game turn.
    this.logger.warn(`Agent only looked (${[...this.lookTools].join(', ')}) without acting — passing`, {
      component: 'agent-runtime',
      agentId: this.agent?.id,
    });
    return passAction();
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