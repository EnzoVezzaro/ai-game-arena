import type { TurnResult } from '@ai-game-arena/match-engine';

interface EventLogProps {
  turns: TurnResult[];
  className?: string;
}

export function EventLog({ turns, className }: EventLogProps) {
  const recent = turns.slice(-50);

  return (
    <div className={`flex flex-col h-full ${className ?? ''}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a4a]">
        <span className="text-xs font-medium text-gray-400 uppercase">Event Stream</span>
        <span className="font-mono text-xs text-gray-500">{recent.length} events</span>
      </div>
      <div className="flex-1 overflow-auto font-mono text-xs">
        {recent.length === 0 ? (
          <div className="p-3 text-gray-500 text-center">Waiting for battle events…</div>
        ) : (
          recent.map((turn, i) => (
            <div key={i} className="px-3 py-1.5 border-b border-[#2a2a4a]/30 hover:bg-[#2a2a4a]/20">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-[10px]">T{turn.turnNumber}</span>
                <span className={`text-[10px] uppercase font-semibold ${
                  turn.outcome.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  {turn.action.type}
                </span>
                <span className="text-gray-400 text-[10px]">{turn.agentId}</span>
              </div>
              {turn.outcome.error && (
                <div className="text-red-400/70 text-[10px] mt-0.5">{turn.outcome.error}</div>
              )}
              {!turn.outcome.success && !turn.outcome.error && (
                <div className="text-gray-500 text-[10px] mt-0.5">rejected</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}