import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { categoryMeta } from '../lib/arena';
import { Icon } from '../lib/Icon';
import { LiveBadge } from '../components/common/LiveBadge';
import { PageLoader } from '../components/common/PageLoader';
import { AgentRoster, type Unit } from '../components/battle/AgentRoster';
import { EventLog, type BattleEventItem } from '../components/battle/EventLog';
import { TurnTimeline } from '../components/battle/TurnTimeline';
import type { Agent } from '../components/common/AgentCard';
import { useBattleWebSocket } from '../hooks/useBattleWebSocket';

interface BattleApi {
  id: string;
  arenaId: string;
  agents: Array<{ id: string; name?: string }>;
  config?: Record<string, unknown>;
  state?: {
    phase?: string;
    currentTurn?: number;
    turn?: number;
    data?: Record<string, unknown>;
  };
  createdAt?: number;
  startedAt?: number;
  finishedAt?: number;
}

const POLL = {
  question: 'Who wins this battle?',
  options: [
    { text: 'The aggressor', votes: 142 },
    { text: 'The defensive hold', votes: 88 },
    { text: 'It ends in a draw', votes: 34 },
  ],
};

function Chip({ label, icon }: { label: string; icon: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
      <Icon name={icon} size={9} />
      {label}
    </span>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors relative',
        active ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon name={icon} size={13} />
      {label}
      {badge != null && (
        <span className="font-mono text-[9px] rounded bg-muted/60 px-1">{badge}</span>
      )}
      {active && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
    </button>
  );
}

export function Battle() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [battle, setBattle] = useState<BattleApi | null>(null);
  const [events, setEvents] = useState<BattleEventItem[]>([]);
  const [status, setStatus] = useState<string>('waiting');
  const [speed, setSpeed] = useState(1);
  const [tab, setTab] = useState<'events' | 'chat'>('events');
  const [poll, setPoll] = useState(POLL);

  const { connected, events: wsEvents, subscribe } = useBattleWebSocket();

  // Load battle + initial events
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const [bRes, eRes] = await Promise.all([
          fetch(`/api/battles/${id}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(`/api/battles/${id}/events`)
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
        ]);
        if (!on) return;
        if (bRes) {
          setBattle(bRes as BattleApi);
          const phase = (bRes as BattleApi).state?.phase || 'waiting';
          setStatus(phase);
        }
        setEvents(
          (
            eRes as Array<{
              type: string;
              timestamp: number;
              payload?: { turn?: number; summary?: string };
            }>
          ).map((e) => ({
            type: e.type,
            turn: e.payload?.turn,
            summary: e.payload?.summary || e.type,
            timestamp: e.timestamp,
          })),
        );
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, [id]);

  // Subscribe to live WS events for this battle
  useEffect(() => {
    if (id) subscribe(id);
  }, [id, subscribe]);

  // Merge WS events into the event stream
  useEffect(() => {
    if (!wsEvents.length) return;
    const recent = wsEvents.slice(-1)[0];
    if (!recent || recent.type !== 'event') return;
    setEvents((prev) => [
      ...prev,
      {
        type: recent.eventType,
        turn: (recent.payload as { turn?: number } | undefined)?.turn,
        summary: (recent.payload as { summary?: string } | undefined)?.summary || recent.eventType,
        timestamp: recent.timestamp ? new Date(recent.timestamp).getTime() : undefined,
      },
    ]);
  }, [wsEvents]);

  const patchStatus = useCallback(
    async (action: 'start' | 'pause' | 'resume' | 'abort') => {
      try {
        await fetch(`/api/battles/${id}/${action}`, { method: 'POST' });
        const r = await fetch(`/api/battles/${id}`).then((r) => (r.ok ? r.json() : null));
        if (r) {
          setBattle(r as BattleApi);
          setStatus((r as BattleApi).state?.phase || status);
        }
      } catch {
        /* ignore */
      }
    },
    [id, status],
  );

  // Arena/game derived vibe
  const arenaSlug = battle?.arenaId || 'classic';
  const arenaCat = categoryMeta(
    (battle?.config as { category?: string } | undefined)?.category || 'classic',
  );
  const accent =
    (battle?.config as { accent_color?: string } | undefined)?.accent_color || arenaCat.color;

  const agents: Agent[] = useMemo(
    () =>
      (battle?.agents || []).map((a) => ({
        id: a.id,
        name: a.name,
        config: battle?.config as Record<string, unknown> | undefined,
      })),
    [battle],
  );

  const gridState = battle?.state?.data as { grid_size?: number; units?: Unit[] } | undefined;
  const hasGrid = gridState && gridState.grid_size && Array.isArray(gridState.units);
  const turn = battle?.state?.currentTurn ?? battle?.state?.turn ?? 0;
  const maxTurns = (battle?.config as { maxTurns?: number } | undefined)?.maxTurns ?? 30;

  if (loading) return <PageLoader label="Composing battle" />;
  if (!battle)
    return (
      <div className="text-center py-24 text-muted-foreground">
        <Icon name="Radio" size={28} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">Battle not found.</p>
        <Link to="/battles" className="text-primary text-xs mt-2 inline-block">
          ← Back to battles
        </Link>
      </div>
    );

  return (
    <div className="px-3 lg:px-6 py-4 max-w-[1500px] mx-auto">
      {/* Top bar */}
      <div className="glass-strong rounded-2xl p-3 lg:p-4 mb-3 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ background: `${accent}22`, border: `1px solid ${accent}55` }}
          >
            {(battle.config as { icon?: string } | undefined)?.icon || '🎮'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <LiveBadge status={status} />
              <span
                className={cn(
                  'font-mono text-[9px]',
                  connected ? 'text-success' : 'text-muted-foreground',
                )}
              >
                {connected ? 'ws live' : 'ws connecting…'}
              </span>
            </div>
            <h1 className="font-display font-bold text-sm lg:text-base truncate mt-0.5">
              {battle.id}
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-2 ml-2">
            <Chip label={arenaSlug} icon="Swords" />
            <Chip label={`${agents.length} agents`} icon="Bot" />
          </div>
        </div>
        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {status === 'running' ? (
              <button
                onClick={() => patchStatus('pause')}
                className="p-1.5 rounded-md hover:bg-muted"
                aria-label="Pause"
              >
                <Icon name="Pause" size={14} />
              </button>
            ) : (
              <button
                onClick={() => (status === 'paused' ? patchStatus('resume') : patchStatus('start'))}
                className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                aria-label="Play"
              >
                <Icon name="Play" size={14} />
              </button>
            )}
            <button
              onClick={() => patchStatus('abort')}
              className="p-1.5 rounded-md hover:bg-muted text-destructive"
              aria-label="Abort"
            >
              <Icon name="Octagon" size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <span className="font-mono text-[10px] text-muted-foreground">SPEED</span>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="bg-muted/50 border border-border rounded px-2 py-1 text-xs font-mono outline-none text-foreground"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mb-3 glass rounded-xl">
        <TurnTimeline currentTurn={turn} maxTurns={maxTurns} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_340px] gap-3">
        {/* Left: roster + poll */}
        <div className="space-y-3 order-2 lg:order-1">
          <div className="glass rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Icon name="Bot" size={13} className="text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Agent Roster
              </span>
            </div>
            <AgentRoster agents={agents} units={hasGrid ? gridState!.units : []} />
          </div>
          <div className="glass rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Icon name="ThumbsUp" size={13} className="text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Spectator Poll
              </span>
            </div>
            <div className="text-xs text-foreground/80 mb-2">{poll.question}</div>
            <div className="space-y-1.5">
              {poll.options.map((o, i) => {
                const total = poll.options.reduce((s, x) => s + x.votes, 0) || 1;
                const pct = Math.round((o.votes / total) * 100);
                return (
                  <button
                    key={i}
                    onClick={() =>
                      setPoll((p) => ({
                        ...p,
                        options: p.options.map((x, idx) =>
                          idx === i ? { ...x, votes: x.votes + 1 } : x,
                        ),
                      }))
                    }
                    className="w-full text-left rounded-lg border border-border bg-card/40 px-2.5 py-1.5 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span>{o.text}</span>
                      <span className="font-mono text-muted-foreground">{o.votes}</span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center: arena grid */}
        <div className="space-y-3 order-1 lg:order-2">
          <div className="glass rounded-2xl p-3 lg:p-4">
            {hasGrid ? (
              <div className="relative w-full">
                <div className="relative aspect-square w-full max-w-[560px] mx-auto rounded-2xl border border-border bg-background/60 overflow-hidden scanline">
                  <div className="absolute inset-0 arena-grid-bg opacity-60" />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(40rem 40rem at 50% 50%, ${accent}10, transparent 60%)`,
                    }}
                  />
                  <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-primary/10 to-transparent animate-scan pointer-events-none" />
                  <div
                    className="relative grid h-full w-full p-3"
                    style={{
                      gridTemplateColumns: `repeat(${gridState!.grid_size}, 1fr)`,
                      gridTemplateRows: `repeat(${gridState!.grid_size}, 1fr)`,
                    }}
                  >
                    {Array.from({ length: gridState!.grid_size! ** 2 }, (_, i) => {
                      const n = gridState!.grid_size!;
                      const x = i % n;
                      const y = Math.floor(i / n);
                      const unit = (gridState!.units || []).find(
                        (u) => u.alive !== false && u.x === x && u.y === y,
                      );
                      return (
                        <div key={i} className="relative flex items-center justify-center">
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
                  <div className="absolute top-2 left-2 font-mono text-[9px] text-muted-foreground tracking-wider">
                    GRID {gridState!.grid_size}×{gridState!.grid_size}
                  </div>
                  <div className="absolute top-2 right-2 font-mono text-[9px] text-primary tracking-wider">
                    TURN {turn}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative aspect-square w-full max-w-[560px] mx-auto rounded-2xl border border-border bg-background/60 overflow-hidden scanline flex flex-col items-center justify-center gap-3">
                <div className="absolute inset-0 arena-grid-bg opacity-40" />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(40rem 40rem at 50% 50%, ${accent}10, transparent 60%)`,
                  }}
                />
                <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-primary/10 to-transparent animate-scan pointer-events-none" />
                <div className="relative flex flex-col items-center gap-3 text-center">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${accent}22`,
                      border: `1px solid ${accent}55`,
                      color: accent,
                    }}
                  >
                    <Icon name="Radio" size={20} className="animate-pulse-glow" />
                  </div>
                  <div>
                    <div className="font-display text-sm font-bold">Live grid unavailable</div>
                    <p className="text-[11px] text-muted-foreground mt-1 max-w-xs px-4">
                      This battle streams events rather than a renderable grid. Watch the event
                      stream on the right.
                    </p>
                  </div>
                </div>
                <div className="absolute top-2 left-2 font-mono text-[9px] text-muted-foreground tracking-wider">
                  {arenaSlug}
                </div>
                <div className="absolute top-2 right-2 font-mono text-[9px] text-primary tracking-wider">
                  TURN {turn}
                </div>
              </div>
            )}
          </div>

          {/* Scoreboard (graceful — scores not served by backend) */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="TrendingUp" size={13} className="text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Scoreboard
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {agents.map((a, i) => (
                <div key={a.id} className="rounded-xl border border-border bg-card/40 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[9px] text-muted-foreground">#{i + 1}</span>
                    <span className="text-[11px] font-medium truncate">{a.name || a.id}</span>
                  </div>
                  <div className="mt-1.5 font-display text-xl font-bold text-muted-foreground">
                    —
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground">score pending</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: tabs events / chat */}
        <div className="order-3 glass rounded-2xl overflow-hidden h-[420px] lg:h-auto lg:min-h-[560px] flex flex-col">
          <div className="flex border-b border-border">
            <TabBtn
              active={tab === 'events'}
              onClick={() => setTab('events')}
              icon="ListTree"
              label="Events"
              badge={events.length}
            />
            <TabBtn
              active={tab === 'chat'}
              onClick={() => setTab('chat')}
              icon="MessageSquare"
              label="Chat"
            />
          </div>
          <div className="flex-1 min-h-0">
            {tab === 'events' ? (
              <EventLog events={events} />
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                  <Icon name="MessageSquare" size={13} className="text-primary" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Spectator Chat
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
                  <p className="text-center text-xs text-muted-foreground py-12">
                    Spectator chat requires a chat backend. <br />
                    Wire a chat plugin to enable channels.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Battle;
