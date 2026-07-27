import type { AgentConfig } from '@ai-game-arena/sdk';

interface AgentRosterProps {
  agents: AgentConfig[];
  scores?: Array<{ agentId: string; score: number }>;
  className?: string;
}

export function AgentRoster({ agents, scores, className }: AgentRosterProps) {
  const scoreFor = (id: string) => scores?.find((s) => s.agentId === id)?.score ?? 0;

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      {agents.map((agent) => (
        <div key={agent.id} className="rounded-xl border border-[#2a2a4a] bg-[#16162a] p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#2a2a4a] flex items-center justify-center font-mono text-xs font-bold text-primary">
              {agent.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{agent.name}</div>
              <div className="font-mono text-[10px] text-gray-500 uppercase">{agent.strategy}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-bold text-primary">{scoreFor(agent.id)}</div>
              <div className="font-mono text-[8px] text-gray-500 uppercase">pts</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}