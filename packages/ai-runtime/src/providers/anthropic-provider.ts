import type { LLMProvider, LLMResponse } from './llm-provider';
import type { McpToolDefinition } from '@ai-game-arena/mcp';
import type { AgentConfig, ProviderConfig } from '@ai-game-arena/sdk';
import { resolveApiKey, decryptApiKey } from './api-key';

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly type = 'anthropic';

  constructor(private config: ProviderConfig) {}

  async decide(
    agent: AgentConfig,
    observation: string,
    tools: McpToolDefinition[],
    history: Array<{ role: 'user' | 'assistant' | 'tool'; content: string }>,
  ): Promise<LLMResponse> {
    const apiKey = decryptApiKey(
      resolveApiKey('anthropic', agent, this.config) ?? '',
    );
    const model = agent.model ?? this.config.model;

    const systemPrompt = this.buildSystemPrompt(agent, tools);

    const messages: Array<{ role: string; content: string }> = [];
    for (const msg of history) {
      messages.push({ role: msg.role === 'tool' ? 'user' : msg.role, content: msg.content });
    }
    messages.push({ role: 'user', content: observation });

    const body: Record<string, unknown> = {
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    };

    if (tools.length > 0) {
      body.tools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: this.inputSchemaToJSONSchema(t.inputSchema),
      }));
    }

    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText} ${errorBody}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown> }>;
      stop_reason: string;
    };

    let content = '';
    const toolCalls: Array<{ name: string; parameters: Record<string, unknown> }> = [];

    for (const block of data.content ?? []) {
      if (block.type === 'text' && block.text) {
        content += block.text;
      } else if (block.type === 'tool_use' && block.name) {
        toolCalls.push({
          name: block.name,
          parameters: block.input ?? {},
        });
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: toolCalls.length > 0 ? 'toolUse' : 'stop',
    };
  }

  async shutdown(): Promise<void> {}

  private inputSchemaToJSONSchema(schema: Record<string, unknown>): Record<string, unknown> {
    if (schema && typeof schema === 'object' && schema.type) {
      return schema as Record<string, unknown>;
    }
    return { type: 'object', properties: {} };
  }

  private buildSystemPrompt(agent: AgentConfig, tools: McpToolDefinition[]): string {
    const toolList = tools.map((t) => `- ${t.name}: ${t.description}`).join('\n');
    return `You are an AI agent named "${agent.name}" playing in a game arena. Your strategy is "${agent.strategy}".\nAvailable tools:\n${toolList}\n\nThe observation describes the game state you are in. Read it carefully: it contains your position, the board, your enemies, the current turn, and the actions available to you. Use the observation to decide which tool to call and what parameters to pass. Respond with tool calls when an action is needed, or with a message when no action is appropriate.`;
  }
}
