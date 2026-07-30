import React from "react";
import { cn } from "@/lib/utils";

// The game grid renderer — units are AI agents manipulating their controllers.
export default function ArenaGrid({ state, accent = "#38bdf8" }) {
  const n = state.grid_size || 8;
  const cells = Array.from({ length: n * n }, (_, i) => ({ x: i % n, y: Math.floor(i / n) }));
  const units = state.units || [];

  return (
    <div className="relative w-full">
      <div className="relative aspect-square w-full max-w-[560px] mx-auto rounded-2xl border border-border bg-background/60 overflow-hidden scanline">
        <div className="absolute inset-0 arena-grid-bg opacity-60" />
        <div className="absolute inset-0" style={{ background: `radial-gradient(40rem 40rem at 50% 50%, ${accent}10, transparent 60%)` }} />
        {/* scan beam */}
        <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-primary/10 to-transparent animate-scan pointer-events-none" />

        <div className="relative grid h-full w-full p-3" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }}>
          {cells.map((c) => {
            const unit = units.find(u => u.alive && u.x === c.x && u.y === c.y);
            return (
              <div key={`${c.x}-${c.y}`} className="relative flex items-center justify-center">
                {unit && <UnitToken unit={unit} />}
              </div>
            );
          })}
        </div>

        {/* corner HUD */}
        <div className="absolute top-2 left-2 font-mono text-[9px] text-muted-foreground tracking-wider">GRID {n}×{n}</div>
        <div className="absolute top-2 right-2 font-mono text-[9px] text-primary tracking-wider">TURN {state.turn || 0}</div>
      </div>
    </div>
  );
}

function UnitToken({ unit }) {
  return (
    <div className="relative group flex items-center justify-center" style={{ width: "82%", height: "82%" }}>
      {unit.lastAction?.kind === "attack" && (
        <span className="absolute inset-0 rounded-full animate-ping" style={{ background: `${unit.color}40` }} />
      )}
      <div
        className={cn(
          "relative h-full w-full rounded-lg flex items-center justify-center font-mono font-bold text-sm transition-all duration-300",
          unit.lastAction?.kind === "hit" && "animate-pulse-glow"
        )}
        style={{
          background: `linear-gradient(140deg, ${unit.color}40, ${unit.color}15)`,
          border: `1.5px solid ${unit.color}`,
          color: unit.color,
          boxShadow: `0 0 16px -2px ${unit.color}aa`,
          opacity: unit.alive ? 1 : 0.3
        }}
      >
        {unit.symbol}
      </div>
      {/* hp bar */}
      <div className="absolute -bottom-1.5 left-1 right-1 h-1 rounded-full bg-black/50 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${unit.hp}%`, background: unit.hp > 50 ? "#34d399" : unit.hp > 25 ? "#fbbf24" : "#f43f5e" }} />
      </div>
    </div>
  );
}