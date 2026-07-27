interface TurnTimelineProps {
  currentTurn: number;
  maxTurns: number;
}

export function TurnTimeline({ currentTurn, maxTurns }: TurnTimelineProps) {
  const pct = Math.min(100, (currentTurn / maxTurns) * 100);

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="flex items-center gap-1.5 font-mono text-xs text-gray-400">
        <span className="text-primary">TURN</span>
      </div>
      <div className="flex-1 h-2 rounded-full bg-[#2a2a4a] overflow-hidden relative">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="font-mono text-sm font-bold text-white">
        <span className="text-primary">{currentTurn}</span>
        <span className="text-gray-500">/{maxTurns}</span>
      </div>
    </div>
  );
}