import type { McpToolDefinition } from '@ai-game-arena/mcp';
import type { AgentConfig } from '@ai-game-arena/sdk';

export interface LLMResponse {
  content: string;
  toolCalls?: Array<{
    name: string;
    parameters: Record<string, unknown>;
  }>;
  finishReason: 'stop' | 'toolUse' | 'error';
}

export interface LLMProvider {
  readonly name: string;
  readonly type: string;
  decide(
    agent: AgentConfig,
    observation: string,
    tools: McpToolDefinition[],
    history: Array<{ role: 'user' | 'assistant' | 'tool'; content: string }>,
  ): Promise<LLMResponse>;
  shutdown(): Promise<void>;
}