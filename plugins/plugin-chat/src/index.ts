import type { PluginContext, ServerRoute } from '@ai-game-arena/sdk';

/**
 * Chat plugin — spectator/agent chat held in plugin storage (extends db core).
 *
 * Server routes (mounted by the server via plugin-contributed server routes):
 *   GET    /api/chat/battles/:battleId          → recent messages (oldest first)
 *   POST   /api/chat/battles/:battleId          body { from, content } → send
 */

interface ChatMessage {
  id: string;
  battleId: string;
  from: string;
  content: string;
  role: 'spectator' | 'agent' | 'system';
  color?: string;
  timestamp: number;
}

const key = (battleId: string) => `chat:${battleId}`;
const MAX_HISTORY = 200;

interface HonoReq {
  param: (name: string) => string | undefined;
  json: () => Promise<Record<string, unknown>>;
}

let broadcastFn: ((battleId: string, msg: ChatMessage) => void) | null = null;

export async function activate(ctx: PluginContext): Promise<void> {
  ctx.logger.info('Chat plugin activated', { component: 'plugin-chat' });

  ctx.registerMcpTool({
    name: 'send_chat_message',
    description: 'Send a message to the chat',
    parameters: {
      content: { type: 'string', description: 'Message content' },
    },
  });

  // Seed a friendly system message when a battle starts.
  ctx.registerEventHandler({
    eventTypes: ['MATCH_STARTED', 'BattleStarted', 'MATCH_FINISHED', 'BattleFinished'],
    handler: async (event) => {
      const e = event as { type: string; aggregateId?: string };
      const battleId = e.aggregateId;
      if (!battleId) return;
      const list = (await ctx.storage.get<ChatMessage[]>(key(battleId))) ?? [];
      if (e.type === 'MATCH_STARTED' || e.type === 'BattleStarted') {
        list.push(system(battleId, 'Match started! Spectators can now chat.'));
      } else {
        list.push(system(battleId, 'Match finished!'));
      }
      await ctx.storage.set(key(battleId), list.slice(-MAX_HISTORY));
    },
  });

  const routes: ServerRoute[] = [
    {
      method: 'GET',
      path: '/api/chat/battles/:battleId',
      async handler(req) {
        const r = req as HonoReq;
        const battleId = r.param('battleId')!;
        const list = (await ctx.storage.get<ChatMessage[]>(key(battleId))) ?? [];
        return list;
      },
    },
    {
      method: 'POST',
      path: '/api/chat/battles/:battleId',
      async handler(req) {
        const r = req as HonoReq;
        const battleId = r.param('battleId')!;
        const body = (await r.json()) as { from?: string; content?: string; color?: string };
        const from = (body.from ?? 'spectator').toString().trim() || 'spectator';
        const content = (body.content ?? '').toString().trim();
        if (!content) throw new Error('content is required');
        const list = (await ctx.storage.get<ChatMessage[]>(key(battleId))) ?? [];
        const msg: ChatMessage = {
          id: `msg-${battleId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          battleId,
          from,
          content,
          role: 'spectator',
          color: body.color,
          timestamp: Date.now(),
        };
        list.push(msg);
        await ctx.storage.set(key(battleId), list.slice(-MAX_HISTORY));
        if (broadcastFn) broadcastFn(battleId, msg);
        return msg;
      },
    },
  ];

  for (const route of routes) ctx.registerServerRoute(route);
}

export async function deactivate(_ctx: PluginContext): Promise<void> {
  broadcastFn = null;
}

/** Lets an external (live WS layer) subscribe to new messages pushed by POST. */
export function setChatBroadcaster(fn: ((battleId: string, msg: ChatMessage) => void) | null): void {
  broadcastFn = fn;
}

function system(battleId: string, content: string): ChatMessage {
  return {
    id: `msg-${battleId}-${Date.now()}`,
    battleId,
    from: 'system',
    content,
    role: 'system',
    timestamp: Date.now(),
  };
}

// Re-export for tests / external consumers.
export type { ChatMessage };
