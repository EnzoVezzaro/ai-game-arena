import type { LLMProvider, LLMResponse } from './llm-provider';
import type { McpToolDefinition } from '@ai-game-arena/mcp';
import type { AgentConfig, ProviderConfig } from '@ai-game-arena/sdk';
import { resolveApiKey, decryptApiKey } from './api-key';

export class GoogleProvider implements LLMProvider {
  readonly name = 'google';
  readonly type = 'google';

  constructor(private config: ProviderConfig) {}

  async decide(
    agent: AgentConfig,
    observation: string,
    tools: McpToolDefinition[],
    history: Array<{ role: 'user' | 'assistant' | 'tool'; content: string }>,
  ): Promise<LLMResponse> {
    const apiKey = decryptApiKey(
      resolveApiKey('google', agent, this.config) ?? '',
    );
    const model = agent.model ?? this.config.model;

    const systemPrompt = this.buildSystemPrompt(agent, tools);

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    for (const msg of history) {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      contents.push({ role, parts: [{ text: msg.content }] });
    }
    contents.push({ role: 'user', parts: [{ text: observation }] });

    const body: Record<string, unknown> = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
    };

    if (tools.length > 0) {
      body.tools = [
        {
          function_declarations: tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: this.inputSchemaToJSONSchema(t.inputSchema),
          })),
        },
      ];
    }

    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const response = await fetch(
      `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Google API error: ${response.status} ${response.statusText} ${errorBody}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }> };
      }>;
    };

    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];

    let content = '';
    const toolCalls: Array<{ name: string; parameters: Record<string, unknown> }> = [];

    for (const part of parts) {
      if (part.text) {
        content += part.text;
      } else if (part.functionCall) {
        toolCalls.push({
          name: part.functionCall.name,
          parameters: part.functionCall.args,
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
