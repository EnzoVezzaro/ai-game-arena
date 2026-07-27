import type { PluginContext } from '@ai-game-arena/sdk';

interface ChatMessage {
  id: string;
  from: string;
  content: string;
  timestamp: Date;
  type: 'spectator' | 'agent' | 'system';
}

const messages: ChatMessage[] = [];

export async function activate(ctx: PluginContext): Promise<void> {
  ctx.logger.info('Chat plugin activated', { component: 'plugin-chat' });

  // Register MCP tool for agents to send messages
  ctx.registerMcpTool({
    name: 'send_chat_message',
    description: 'Send a message to the chat',
    parameters: {
      content: { type: 'string', description: 'Message content' },
    },
  });

  // Listen for match events
  ctx.registerEventHandler({
    eventTypes: ['MATCH_STARTED', 'MATCH_FINISHED'],
    handler: async (event: unknown) => {
      const e = event as { type: string };
      if (e.type === 'MATCH_STARTED') {
        addSystemMessage('Match started! Spectators can now chat.');
      } else if (e.type === 'MATCH_FINISHED') {
        addSystemMessage('Match finished!');
      }
    },
  });
}

export async function deactivate(_ctx: PluginContext): Promise<void> {
  messages.length = 0;
}

function addSystemMessage(content: string): void {
  messages.push({
    id: `msg-${Date.now()}`,
    from: 'system',
    content,
    timestamp: new Date(),
    type: 'system',
  });
}

export function getMessages(): ChatMessage[] {
  return [...messages];
}

export function addMessage(
  from: string,
  content: string,
  type: 'spectator' | 'agent' = 'spectator',
): ChatMessage {
  const msg: ChatMessage = {
    id: `msg-${Date.now()}`,
    from,
    content,
    timestamp: new Date(),
    type,
  };
  messages.push(msg);
  return msg;
}
