import type { LLMProvider, LLMResponse } from './llm-provider';
import type { McpToolDefinition } from '@ai-game-arena/mcp';

export class MockProvider implements LLMProvider {
  readonly name = 'mock';
  readonly type = 'mock';

  async decide(
    _agent: unknown,
    _observation: string,
    tools: McpToolDefinition[],
    _history: Array<{ role: 'user' | 'assistant' | 'tool'; content: string }>,
  ): Promise<LLMResponse> {
    const passTool = tools.find((t) => t.name === 'pass');
    const firstTool = tools[0];
    const toolCalls = passTool
      ? [{ name: 'pass', parameters: {} }]
      : firstTool
        ? [{ name: firstTool.name, parameters: {} }]
        : undefined;

    return {
      content: 'Mock decision — no LLM configured',
      toolCalls,
      finishReason: toolCalls ? 'toolUse' : 'stop',
    };
  }

  async shutdown(): Promise<void> {}
}
