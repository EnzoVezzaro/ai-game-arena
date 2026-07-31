interface TurnTimelineProps {
  currentTurn: number;
  /**
   * Upper bound for the progress bar. Defaults to Infinity — battles run until
   * the arena's win condition fires or an admin pauses/aborts (see
   * docs/battles/lifecycle.md), so by default there is no turn cap to show.
   */
  maxTurns?: number;
}

export function TurnTimeline({ currentTurn, maxTurns }: TurnTimelineProps) {
  const capped = Number.isFinite(maxTurns ?? Infinity) && (maxTurns ?? 0) > 0;
  const pct = capped ? Math.min(100, (currentTurn / (maxTurns as number)) * 100) : 0;
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="text-primary">TURN</span>
      </div>
      {capped ? (
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden relative">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-primary/30 to-transparent" />
        </div>
      )}
      <div className="font-mono text-sm font-bold">
        <span className="text-primary">{currentTurn}</span>
        {capped && <span className="text-muted-foreground">/{maxTurns}</span>}
      </div>
    </div>
  );
}
