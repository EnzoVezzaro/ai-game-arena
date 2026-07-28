import type { WorldState } from '@ai-game-arena/sdk';

interface GridRendererProps {
  state: WorldState;
}

export function GridRenderer({ state }: GridRendererProps) {
  const data = state.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const n = (data.grid_size ?? 8) as number;
  const cells = Array.from({ length: n * n }, (_, i) => ({
    x: i % n,
    y: Math.floor(i / n),
  }));
  const units = (data.units ?? []) as Array<{
    id: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    alive: boolean;
    color: string;
    symbol: string;
  }>;

  return (
    <div className="relative w-full max-w-[560px] mx-auto">
      <div className="relative aspect-square rounded-2xl border border-[#2a2a4a] bg-[#16162a]/60 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(hsla(222,34%,16%,0.5) 1px, transparent 1px), linear-gradient(90deg, hsla(222,34%,16%,0.5) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(40rem 40rem at 50% 50%, hsl(189 95% 52% / 0.08), transparent 60%)`,
          }}
        />
        <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

        <div
          className="relative grid h-full w-full p-3"
          style={{
            gridTemplateColumns: `repeat(${n}, 1fr)`,
            gridTemplateRows: `repeat(${n}, 1fr)`,
          }}
        >
          {cells.map((c) => {
            const unit = units.find((u) => u.alive && u.x === c.x && u.y === c.y);
            return (
              <div key={`${c.x}-${c.y}`} className="relative flex items-center justify-center">
                {unit && (
                  <div
                    className="relative group flex items-center justify-center"
                    style={{ width: '82%', height: '82%' }}
                  >
                    <div
                      className="relative h-full w-full rounded-lg flex items-center justify-center font-mono font-bold text-sm transition-all duration-300"
                      style={{
                        background: `linear-gradient(140deg, ${unit.color}40, ${unit.color}15)`,
                        border: `1.5px solid ${unit.color}`,
                        color: unit.color,
                        opacity: unit.alive ? 1 : 0.3,
                      }}
                    >
                      {unit.symbol}
                    </div>
                    <div className="absolute -bottom-1.5 left-1 right-1 h-1 rounded-full bg-black/50 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${unit.hp}%`,
                          background:
                            unit.hp > 50 ? '#34d399' : unit.hp > 25 ? '#fbbf24' : '#f43f5e',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="absolute top-2 left-2 font-mono text-[9px] text-gray-500 tracking-wider">
          GRID {n}×{n}
        </div>
        <div className="absolute top-2 right-2 font-mono text-[9px] text-primary tracking-wider">
          TURN {state.turn}
        </div>
      </div>
    </div>
  );
}
