import type { Logger, AgentConfig, AgentAction, AgentMemory } from '@ai-game-arena/sdk';
import type { Observation as ObservationType } from '@ai-game-arena/sdk';
import type { McpToolResult } from '@ai-game-arena/mcp';
import type { Controller } from '@ai-game-arena/sdk';
import type { LLMProvider } from './providers/llm-provider';
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
export declare class AgentRuntime {
    private logger;
    private agent;
    private mcpClient;
    private llmProvider;
    private memory;
    private lastObservation;
    private decisionHistory;
    private readonly lookTools;
    private readonly maxLookTurns;
    private readonly injectedProvider;
    constructor(options: AgentRuntimeOptions);
    initialize(agent: AgentConfig): Promise<void>;
    connectToController(controller: Controller): Promise<void>;
    observe(observation: ObservationType): Promise<void>;
    decide(): Promise<AgentAction>;
    executeTool(toolName: string, args: Record<string, unknown>): Promise<McpToolResult>;
    communicate(message: string, _to?: string): Promise<void>;
    getMemory(): AgentMemory;
    getAgent(): AgentConfig | null;
    getLastObservation(): ObservationType | null;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=agent-runtime.d.ts.map