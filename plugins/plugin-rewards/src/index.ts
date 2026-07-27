import type { PluginContext } from '@ai-game-arena/sdk';

interface AgentReward {
  agentId: string;
  wins: number;
  losses: number;
  draws: number;
  totalScore: number;
  matchesPlayed: number;
  achievements: string[];
}

const rewards = new Map<string, AgentReward>();

export async function activate(ctx: PluginContext): Promise<void> {
  ctx.logger.info('Rewards plugin activated', { component: 'plugin-rewards' });

  ctx.registerMcpTool({
    name: 'get_rewards',
    description: 'Get rewards for an agent',
    parameters: {
      agentId: { type: 'string', description: 'Agent ID' },
    },
  });

  ctx.registerMcpTool({
    name: 'get_leaderboard',
    description: 'Get the leaderboard',
    parameters: {},
  });

  // Listen for match finished events
  ctx.registerEventHandler({
    eventTypes: ['MATCH_FINISHED'],
    handler: async (event: unknown) => {
      const e = event as {
        payload?: { agents?: Array<{ id: string }>; scores?: Record<string, number> };
      };
      const { agents, scores } = e.payload ?? {};
      if (!agents || !scores) return;

      // Find winner
      const sortedAgents = Object.entries(scores).sort((a, b) => b[1] - a[1]);
      const winnerId = sortedAgents[0]?.[0];

      for (const agent of agents) {
        const reward = getOrCreateReward(agent.id);
        reward.matchesPlayed++;

        if (agent.id === winnerId) {
          reward.wins++;
          reward.achievements.push('victory');
        } else if (sortedAgents.length > 1 && sortedAgents[1]?.[1] === scores[agent.id]) {
          reward.draws++;
        } else {
          reward.losses++;
        }

        reward.totalScore += scores[agent.id] ?? 0;
      }
    },
  });
}

export async function deactivate(_ctx: PluginContext): Promise<void> {
  rewards.clear();
}

function getOrCreateReward(agentId: string): AgentReward {
  let reward = rewards.get(agentId);
  if (!reward) {
    reward = {
      agentId,
      wins: 0,
      losses: 0,
      draws: 0,
      totalScore: 0,
      matchesPlayed: 0,
      achievements: [],
    };
    rewards.set(agentId, reward);
  }
  return reward;
}

export function getRewards(agentId: string): AgentReward | undefined {
  return rewards.get(agentId);
}

export function getLeaderboard(): AgentReward[] {
  return Array.from(rewards.values()).sort(
    (a, b) => b.wins - a.wins || b.totalScore - a.totalScore,
  );
}
