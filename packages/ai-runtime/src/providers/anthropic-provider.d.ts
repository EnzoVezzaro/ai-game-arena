import type { LLMProvider, LLMResponse } from './llm-provider';
import type { McpToolDefinition } from '@ai-game-arena/mcp';
import type { AgentConfig, ProviderConfig } from '@ai-game-arena/sdk';
export declare class AnthropicProvider implements LLMProvider {
    private config;
    readonly name = "anthropic";
    readonly type = "anthropic";
    constructor(config: ProviderConfig);
    decide(agent: AgentConfig, observation: string, tools: McpToolDefinition[], history: Array<{
        role: 'user' | 'assistant' | 'tool';
        content: string;
    }>): Promise<LLMResponse>;
    shutdown(): Promise<void>;
    private inputSchemaToJSONSchema;
    private buildSystemPrompt;
}
//# sourceMappingURL=anthropic-provider.d.ts.map