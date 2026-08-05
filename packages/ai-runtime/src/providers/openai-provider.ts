import type { LLMProvider, LLMResponse } from './llm-provider';
import type { McpToolDefinition } from '@ai-game-arena/mcp';
import type { AgentConfig, ProviderConfig } from '@ai-game-arena/sdk';
import { resolveApiKey, decryptApiKey } from './api-key';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly type = 'openai';

  constructor(private config: ProviderConfig) {}

  async decide(
    agent: AgentConfig,
    observation: string,
    tools: McpToolDefinition[],
    history: Array<{ role: 'user' | 'assistant' | 'tool'; content: string }>,
  ): Promise<LLMResponse> {
    const apiKey = decryptApiKey(
      resolveApiKey('openai', agent, this.config) ?? '',
    );
    const model = agent.model ?? this.config.model;

    const systemPrompt = this.buildSystemPrompt(agent, tools);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((msg) => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: observation },
    ];

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    };

    if (tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: this.inputSchemaToJSONSchema(t.inputSchema),
        },
      }));
      body.tool_choice = 'auto';
    }

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}: ${errorBody}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content?: string; tool_calls?: Array<{ function: { name: string; arguments: string } }> } }>;
    };

    const choice = data.choices[0]?.message;
    if (!choice) {
      return { content: '', finishReason: 'error' };
    }

    const toolCalls = choice.tool_calls?.map((tc) => ({
      name: tc.function.name,
      parameters: JSON.parse(tc.function.arguments),
    }));

    return {
      content: choice.content ?? '',
      toolCalls,
      finishReason: toolCalls && toolCalls.length > 0 ? 'toolUse' : 'stop',
    };
  }

  async shutdown(): Promise<void> {}

  private inputSchemaToJSONSchema(schema: Record<string, unknown>): Record<string, unknown> {
    if (!schema || typeof schema !== 'object') {
      return { type: 'object', properties: {} };
    }
    if (schema.type) {
      return schema as Record<string, unknown>;
    }
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(schema)) {
      const def = value as Record<string, unknown>;
      properties[key] = {
        type: (def.type as string) ?? 'string',
        description: (def.description as string) ?? '',
      };
      if (def.required) {
        required.push(key);
      }
    }
    return { type: 'object', properties, ...(required.length > 0 ? { required } : {}) };
  }

  private buildSystemPrompt(agent: AgentConfig, tools: McpToolDefinition[]): string {
    const toolList = tools.map((t) => `- ${t.name}: ${t.description}`).join('\n');
    return `You are an AI agent named "${agent.name}" playing in a game arena. Your strategy is "${agent.strategy}".\nAvailable tools:\n${toolList}\n\nThe observation describes the game state you are in. Read it carefully: it contains your position, the board, your enemies, the current turn, and the actions available to you. Use the observation to decide which tool to call and what parameters to pass. Respond with tool calls when an action is needed, or with a message when no action is appropriate.`;
  }
}