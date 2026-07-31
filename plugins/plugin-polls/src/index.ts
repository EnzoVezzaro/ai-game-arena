import type { PluginContext, ServerRoute } from '@ai-game-arena/sdk';

/**
 * Polls plugin — holds polls per battle in plugin storage (extends the db core).
 *
 * Server routes (mounted by the server via plugin-contributed server routes):
 *   GET    /api/polls/battles/:battleId       → current poll for a battle
 *   POST   /api/polls/battles/:battleId       body { question, options } → create
 *   POST   /api/polls/battles/:battleId/vote  body { optionIndex } → vote
 */
interface PollOption {
  text: string;
  votes: number;
}
interface Poll {
  id: string;
  battleId: string;
  question: string;
  options: PollOption[];
  createdAt: number;
}

const key = (battleId: string) => `poll:${battleId}`;

// Minimal Hono request facade the server passes us.
interface HonoReq {
  param: (name: string) => string | undefined;
  json: () => Promise<Record<string, unknown>>;
  query: (name?: string) => string | Record<string, string> | undefined;
}

export async function activate(ctx: PluginContext): Promise<void> {
  ctx.logger.info('Polls plugin activated', { component: 'plugin-polls' });

  ctx.registerMcpTool({
    name: 'create_poll',
    description: 'Create a new poll',
    parameters: {
      question: { type: 'string', description: 'Poll question' },
      options: { type: 'array', description: 'Poll options' },
    },
  });

  ctx.registerMcpTool({
    name: 'vote_poll',
    description: 'Vote on a poll',
    parameters: {
      pollId: { type: 'string', description: 'Poll ID' },
      option: { type: 'string', description: 'Option to vote for' },
    },
  });

  // Seed a default poll for any battle that starts so spectators have something
  // to vote on; clients can replace it via POST.
  ctx.registerEventHandler({
    eventTypes: ['BattleStarted'],
    handler: async (event) => {
      const e = event as { aggregateId?: string };
      const battleId = e.aggregateId;
      if (!battleId) return;
      const existing = await ctx.storage.get<Poll>(key(battleId));
      if (existing) return;
      const poll: Poll = {
        id: `poll-${battleId}-${Date.now()}`,
        battleId,
        question: 'Who wins this battle?',
        options: [
          { text: 'The aggressor', votes: 0 },
          { text: 'The defensive hold', votes: 0 },
          { text: 'It ends in a draw', votes: 0 },
        ],
        createdAt: Date.now(),
      };
      await ctx.storage.set(key(battleId), poll);
    },
  });

  const ensure = async (battleId: string): Promise<Poll> => {
    const existing = await ctx.storage.get<Poll>(key(battleId));
    if (existing) return existing;
    const poll: Poll = {
      id: `poll-${battleId}-${Date.now()}`,
      battleId,
      question: 'Who wins this battle?',
      options: [
        { text: 'The aggressor', votes: 0 },
        { text: 'The defensive hold', votes: 0 },
        { text: 'It ends in a draw', votes: 0 },
      ],
      createdAt: Date.now(),
    };
    await ctx.storage.set(key(battleId), poll);
    return poll;
  };

  const routes: ServerRoute[] = [
    {
      method: 'GET',
      path: '/api/polls/battles/:battleId',
      async handler(req) {
        const r = req as HonoReq;
        const battleId = r.param('battleId')!;
        const poll = await ensure(battleId);
        return poll;
      },
    },
    {
      method: 'POST',
      path: '/api/polls/battles/:battleId',
      async handler(req) {
        const r = req as HonoReq;
        const battleId = r.param('battleId')!;
        const body = (await r.json()) as { question?: string; options?: string[] };
        if (!body.question || !Array.isArray(body.options) || body.options.length < 2) {
          throw new Error('question and ≥2 options required');
        }
        const poll: Poll = {
          id: `poll-${battleId}-${Date.now()}`,
          battleId,
          question: body.question,
          options: body.options.map((text) => ({ text, votes: 0 })),
          createdAt: Date.now(),
        };
        await ctx.storage.set(key(battleId), poll);
        return poll;
      },
    },
    {
      method: 'POST',
      path: '/api/polls/battles/:battleId/vote',
      async handler(req) {
        const r = req as HonoReq;
        const battleId = r.param('battleId')!;
        const body = (await r.json()) as { optionIndex?: number };
        const poll = await ensure(battleId);
        const idx = Number(body.optionIndex);
        if (!Number.isInteger(idx) || idx < 0 || idx >= poll.options.length) {
          throw new Error('Invalid option index');
        }
        const option = poll.options[idx];
        if (!option) {
          throw new Error('Invalid option index');
        }
        poll.options[idx] = { ...option, votes: option.votes + 1 };
        await ctx.storage.set(key(battleId), poll);
        return poll;
      },
    },
  ];

  for (const route of routes) ctx.registerServerRoute(route);
}

export async function deactivate(_ctx: PluginContext): Promise<void> {
  // Storage is namespaced; we leave historical polls intact.
}
