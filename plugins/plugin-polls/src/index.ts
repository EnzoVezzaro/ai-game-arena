import type { PluginContext } from '@ai-game-arena/sdk';

interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  createdBy: string;
  createdAt: Date;
  closedAt?: Date;
}

const polls: Poll[] = [];

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
}

export async function deactivate(_ctx: PluginContext): Promise<void> {
  polls.length = 0;
}

export function createPoll(question: string, options: string[], createdBy: string): Poll {
  const poll: Poll = {
    id: `poll-${Date.now()}`,
    question,
    options,
    votes: Object.fromEntries(options.map((o) => [o, 0])),
    createdBy,
    createdAt: new Date(),
  };
  polls.push(poll);
  return poll;
}

export function votePoll(pollId: string, option: string): boolean {
  const poll = polls.find((p) => p.id === pollId);
  if (!poll || poll.closedAt) return false;
  if (!poll.options.includes(option)) return false;

  poll.votes[option] = (poll.votes[option] || 0) + 1;
  return true;
}

export function getPolls(): Poll[] {
  return [...polls];
}

export function closePoll(pollId: string): boolean {
  const poll = polls.find((p) => p.id === pollId);
  if (!poll) return false;
  poll.closedAt = new Date();
  return true;
}
