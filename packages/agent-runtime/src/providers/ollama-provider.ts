import type { LLMProvider, LLMResponse } from './llm-provider';
import type { McpToolDefinition } from '@ai-game-arena/mcp';
import type { AgentConfig, ProviderConfig } from '@ai-game-arena/sdk';

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  readonly type = 'ollama';

  constructor(private config: ProviderConfig) {}

  async decide(
    agent: AgentConfig,
    observation: string,
    tools: McpToolDefinition[],
    history: Array<{ role: 'user' | 'assistant' | 'tool'; content: string }>,
  ): Promise<LLMResponse> {
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
      stream: false,
      options: { temperature: 0.7 },
    };

    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      message: { content: string };
    };

    let toolCalls: Array<{ name: string; parameters: Record<string, unknown> }> | undefined;

    if (data.message?.content) {
      try {
        const parsed = JSON.parse(data.message.content);
        if (parsed.toolCalls) {
          toolCalls = parsed.toolCalls;
        }
      } catch {
        // Content is plain text, not tool calls
      }
    }

    return {
      content: data.message?.content ?? '',
      toolCalls,
      finishReason: toolCalls && toolCalls.length > 0 ? 'toolUse' : 'stop',
    };
  }

  async shutdown(): Promise<void> {}

  private buildSystemPrompt(agent: AgentConfig, tools: McpToolDefinition[]): string {
    const toolList = tools.map((t) => `- ${t.name}: ${t.description}`).join('\n');
    return `You are an AI agent named "${agent.name}" playing in a game arena. Your strategy is "${agent.strategy}".
Available tools:
${toolList}

Analyze the observation, decide which tool to call and what parameters to pass.
Respond with JSON: {"toolCalls":[{"name":"toolName","parameters":{"arg":"value"}}]} when action is needed,
or with a descriptive message when no action is appropriate.`;
  }
}
