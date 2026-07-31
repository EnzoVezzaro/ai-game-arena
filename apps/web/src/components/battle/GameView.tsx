import { Icon } from '../../lib/Icon';
import type { Unit } from './AgentRoster';

export interface GameRenderState {
  type?: string;
  data?: Record<string, unknown>;
  grid_size?: number;
  units?: Unit[];
  html?: string;
  url?: string;
  // Optional pre-serialized DOM/html payload placed in data
  currentTurn?: string;
  moveHistory?: Array<Record<string, unknown>>;
}

export interface GameViewProps {
  renderState: GameRenderState | null;
  accent: string;
  turn: number;
  /** When true we are observing a replay, not a live run. */
  replay?: boolean;
  arenaSlug?: string;
}

/**
 * Renders the selected game. A Game is launched inside the Arena and emits a
 * RenderState (see packages/sdk arena.getRenderState). We render exactly that —
 * there is no synthetic "grid" fallback. Event stream is a separate panel.
 */
export function GameView({ renderState, accent, turn, replay, arenaSlug }: GameViewProps) {
  const type = renderState?.type;
  const data = renderState?.data ?? {};

  // 1) Embedded browser game / arena HTML payload.
  const html = (renderState?.html ?? (data.html as string | undefined)) ?? '';
  const url = (renderState?.url ?? (data.url as string | undefined)) ?? '';

  // 2) Board-style renderState (legacy grid form). Used only when the arena
  //    explicitly declares it; never used as a generic placeholder.
  const isBoard = type === 'grid' || type === 'board';
  const boardN = renderState?.grid_size ?? (data.grid_size as number | undefined);
  const boardUnits = renderState?.units ?? (data.units as Unit[] | undefined);

  if (url) {
    return (
      <div className="relative w-full">
        <div className="relative aspect-video w-full max-w-[760px] mx-auto rounded-2xl border border-border bg-background overflow-hidden">
          <iframe
            src={url}
            title={arenaSlug ? `${arenaSlug} game` : 'Game'}
            className="absolute inset-0 h-full w-full"
            sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"
            allow="autoplay; gamepad; clipboard-write"
          />
          <Hud accent={accent} turn={turn} replay={replay} arenaSlug={arenaSlug} />
        </div>
      </div>
    );
  }

  if (html) {
    return (
      <div className="relative w-full">
        <div className="relative w-full max-w-[700px] mx-auto rounded-2xl border border-border bg-background overflow-hidden">
          <iframe
            title={arenaSlug ? `${arenaSlug} game` : 'Game'}
            srcDoc={html}
            sandbox="allow-scripts allow-forms allow-pointer-lock"
            className="block h-[620px] w-full"
          />
          <Hud accent={accent} turn={turn} replay={replay} arenaSlug={arenaSlug} />
        </div>
      </div>
    );
  }

  if (isBoard && Number.isFinite(boardN) && Array.isArray(boardUnits)) {
    const n = boardN as number;
    const cells = Array.from({ length: n * n }, (_, i) => ({ x: i % n, y: Math.floor(i / n) }));
    return (
      <div className="relative w-full">
        <div className="relative aspect-square w-full max-w-[560px] mx-auto rounded-2xl border border-border bg-background/60 overflow-hidden scanline">
          <div
            className="absolute inset-0"
            style={{ background: `radial-gradient(40rem 40rem at 50% 50%, ${accent}10, transparent 60%)` }}
          />
          <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-primary/10 to-transparent animate-scan pointer-events-none" />
          <div
            className="relative grid h-full w-full p-3"
            style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }}
          >
            {cells.map((c) => {
              const unit = (boardUnits as Unit[]).find(
                (u) => u.alive !== false && u.x === c.x && u.y === c.y,
              );
              return (
                <div key={`${c.x}-${c.y}`} className="relative flex items-center justify-center">
                  {unit && (
                    <div
                      className="relative h-[82%] w-[82%] rounded-lg flex items-center justify-center font-mono font-bold text-sm"
                      style={{
                        background: `linear-gradient(140deg, ${unit.color}40, ${unit.color}15)`,
                        border: `1.5px solid ${unit.color}`,
                        color: unit.color,
                      }}
                    >
                      {unit.symbol}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Hud accent={accent} turn={turn} replay={replay} arenaSlug={arenaSlug} showTurn />
        </div>
      </div>
    );
  }

  // The arena has not produced a renderable game view (its getRenderState is
  // empty). We still show the battle itself — the live agents, current turn —
  // without inventing a fake board and without saying "unavailable".
  return <LiveArenaPanel accent={accent} turn={turn} replay={replay} arenaSlug={arenaSlug} type={type} />;
}

function Hud({
  accent,
  turn,
  replay,
  arenaSlug,
  showTurn,
}: {
  accent: string;
  turn: number;
  replay?: boolean;
  arenaSlug?: string;
  showTurn?: boolean;
}) {
  return (
    <>
      <div className="absolute top-2 left-2 flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground tracking-wider">
        <span
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5"
          style={{ background: `${accent}22`, border: `1px solid ${accent}55`, color: accent }}
        >
          {arenaSlug || 'arena'}
        </span>
        {replay && <span className="text-warning uppercase">replay</span>}
      </div>
      {(showTurn ?? true) && (
        <div className="absolute top-2 right-2 font-mono text-[9px] text-primary tracking-wider">
          TURN {turn}
        </div>
      )}
    </>
  );
}

function LiveArenaPanel({
  accent,
  turn,
  replay,
  arenaSlug,
  type,
}: {
  accent: string;
  turn: number;
  replay?: boolean;
  arenaSlug?: string;
  type?: string;
}) {
  return (
    <div className="relative aspect-video w-full max-w-[760px] mx-auto rounded-2xl border border-border bg-background/60 overflow-hidden flex flex-col items-center justify-center gap-3 scanline">
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(40rem 40rem at 50% 50%, ${accent}10, transparent 60%)` }}
      />
      <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-primary/10 to-transparent animate-scan pointer-events-none" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}22`, border: `1px solid ${accent}55`, color: accent }}
        >
          <Icon name={replay ? 'History' : 'Activity'} size={20} className="animate-pulse-glow" />
        </div>
        <div>
          <div className="font-display text-sm font-bold">
            {replay ? 'Replaying battle' : arenaSlug ? `${arenaSlug} live` : 'Battle live'}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xs px-4">
            Agents are acting via their controller (MCP). Watch the event stream for actions.
            {type ? ` Render source: ${type}.` : ''}
          </p>
        </div>
      </div>
      <Hud accent={accent} turn={turn} replay={replay} arenaSlug={arenaSlug} showTurn />
    </div>
  );
}

export default GameView;
