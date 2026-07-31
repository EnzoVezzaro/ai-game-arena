import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { categoryMeta } from '../lib/arena';
import { Icon } from '../lib/Icon';
import { LiveBadge } from '../components/common/LiveBadge';
import { PageLoader } from '../components/common/PageLoader';
import { AgentRoster, type Unit } from '../components/battle/AgentRoster';
import { EventLog, type BattleEventItem } from '../components/battle/EventLog';
import { TurnTimeline } from '../components/battle/TurnTimeline';
import { GameView } from '../components/battle/GameView';
import { SpectatorChat } from '../components/battle/SpectatorChat';
import type { Agent } from '../components/common/AgentCard';
import { useBattleWebSocket } from '../hooks/useBattleWebSocket';
import { useBattlePolls } from '../hooks/useBattlePolls';
import { ReplayManager, type ReplaySpeed } from '../lib/replayManager';

interface BattleApi {
  id: string;
  arenaId: string;
  agents: Array<{ id: string; name?: string }>;
  config?: Record<string, unknown>;
  state?: {
    phase?: string;
    currentTurn?: number;
    turn?: number;
  };
  renderState?: {
    type?: string;
    data?: Record<string, unknown>;
    grid_size?: number;
    units?: Unit[];
    html?: string;
    url?: string;
    currentTurn?: string;
    moveHistory?: Array<Record<string, unknown>>;
  };
  createdAt?: number;
  startedAt?: number;
  finishedAt?: number;
}

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
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [battle, setBattle] = useState<BattleApi | null>(null);
  const [events, setEvents] = useState<BattleEventItem[]>([]);
  const [status, setStatus] = useState<string>('waiting');
  const [tab, setTab] = useState<'events' | 'chat'>('events');
  // Replay-only playback speed (ReplayManager). Live battles have no speed knob.
  const [replaySpeed, setReplaySpeed] = useState<ReplaySpeed>(1);

  const { connected, events: wsEvents, subscribe } = useBattleWebSocket();
  const pollState = useBattlePolls(id);
  // Normalised poll view rendered by <PollPanel> below.
  const poll = {
    question: pollState.poll?.question ?? '',
    options: pollState.poll?.options ?? [],
    loading: pollState.loading,
    error: pollState.error,
    vote: pollState.vote,
    voted: null,
  };

  // A battle is in replay mode when it is finished/aborted, or when the user
  // explicitly opens it with ?replay=1. In replay the ReplayManager drives the
  // event stream and exposes SPEED controls; in live there is no SPEED knob.
  const isReplay = (status === 'completed' || status === 'finished' || status === 'aborted') || params.get('replay') === '1';

  const replayRef = useRef<ReplayManager | null>(null);
  if (!replayRef.current) replayRef.current = new ReplayManager({ initialSpeed: 1 });
  const replay = replayRef.current!;

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

  // Replay playback — only for finished/aborted battles. The ReplayManager owns
  // playback speed here; live battles don't expose SPEED (we cannot predict when
  // an AI will act in live mode). See docs/battles/replay.md.
  const [replayEvents, setReplayEvents] = useState<BattleEventItem[]>([]);
  const [replayStepIndex, setReplayStepIndex] = useState(0);
  const [replayTotalEvents, setReplayTotalEvents] = useState(0);

  useEffect(() => {
    if (!id || !isReplay) return;
    const mgr = replay;
    let cancelled = false;
    mgr.load(id).then(() => {
      if (cancelled) return;
      setReplayTotalEvents(mgr.totalEvents);
      mgr.setOnStep((s) => {
        if (cancelled) return;
        setReplayStepIndex(s.index);
        if (s.event) {
          const p = (s.event.payload ?? {}) as { turn?: number; summary?: string };
          setReplayEvents((prev) => {
            const next: BattleEventItem = {
              type: s.event!.type,
              turn: p.turn,
              summary: p.summary || s.event!.type,
              timestamp: s.event!.timestamp,
            };
            // Replace any transient entry we appended; keep order.
            return [...prev, next].slice(-200);
          });
        }
      });
      mgr.setSpeed(replaySpeed);
      // Start paused so the spectator controls playback.
      mgr.pause();
    });
    return () => {
      cancelled = true;
      mgr.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isReplay]);

  // Sync the replay manager's speed when the replay SPEED knob changes.
  useEffect(() => {
    if (isReplay) replay.setSpeed(replaySpeed);
  }, [replaySpeed, isReplay, replay]);

  // Track which agents are currently thinking
  const [thinkingAgents, setThinkingAgents] = useState<Set<string>>(new Set());

  // Merge WS events into the event stream and update thinking state
  useEffect(() => {
    if (!wsEvents.length) return;
    const recent = wsEvents.slice(-1)[0];
    if (!recent || recent.type !== 'event') return;
    const payload = recent.payload as Record<string, unknown> | undefined;

    let summary = recent.eventType;
    if (recent.eventType === 'ThinkingStarted') {
      summary = `🤔 ${(payload?.agentId as string)?.slice(0, 12)}… thinking`;
      setThinkingAgents((prev) => new Set(prev).add(payload?.agentId as string));
    } else if (recent.eventType === 'ThinkingFinished') {
      summary = `💡 ${(payload?.agentId as string)?.slice(0, 12)}… decided: ${payload?.actionType ?? '?'}`;
      setThinkingAgents((prev) => {
        const next = new Set(prev);
        next.delete(payload?.agentId as string);
        return next;
      });
    } else if (recent.eventType === 'ToolCalled') {
      const params = payload?.parameters as Record<string, unknown> | undefined;
      const paramStr = params ? Object.values(params).slice(0, 4).join(',') : '';
      summary = `🔧 ${(payload?.agentId as string)?.slice(0, 12)}… ${payload?.tool}(${paramStr})`;
    } else if (recent.eventType === 'AgentError') {
      summary = `❌ ${(payload?.agentId as string)?.slice(0, 12)}… ${payload?.error ?? 'Unknown error'}`;
    } else if (recent.eventType === 'ActionRejected') {
      summary = `⛔ ${(payload?.agentId as string)?.slice(0, 12)}… ${payload?.reason ?? 'Invalid'}`;
    } else if (recent.eventType === 'BattleStarted' || recent.eventType === 'BattleResumed') {
      setStatus('running');
      summary = recent.eventType === 'BattleStarted' ? 'Battle started' : 'Battle resumed';
    } else if (recent.eventType === 'BattlePaused') {
      setStatus('paused');
      summary = 'Battle paused';
    } else if (recent.eventType === 'BattleFinished') {
      setStatus('completed');
      summary = `Battle finished${payload?.reason ? ` — ${payload.reason}` : ''}`;
    } else if (recent.eventType === 'BattleAborted') {
      setStatus('aborted');
      summary = `Battle aborted${payload?.reason ? ` — ${payload.reason}` : ''}`;
    } else {
      summary = (payload?.summary as string) || recent.eventType;
    }

    setEvents((prev) => [
      ...prev,
      {
        type: recent.eventType,
        turn: (payload?.turn as number) ?? (payload?.turnNumber as number),
        summary,
        timestamp: recent.timestamp ? new Date(recent.timestamp).getTime() : undefined,
      },
    ]);
  }, [wsEvents]);

  const patchStatus = useCallback(
    async (action: 'start' | 'pause' | 'resume' | 'abort') => {
      try {
        await fetch(`/api/battles/${id}/${action}`, { method: 'POST' });
        // The action endpoints (start/pause/resume/abort) return a small {status} body,
        // not a full BattleApi. Re-fetch the battle to read the authoritative phase.
        const r = await fetch(`/api/battles/${id}`).then((r) => (r.ok ? r.json() : null));
        if (r) {
          setBattle(r as BattleApi);
          const phase = (r as BattleApi).state?.phase || status;
          setStatus(phase === 'resumed' ? 'running' : phase);
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

  const renderState = battle?.renderState ?? null;
  const units = (battle?.renderState as { units?: Unit[] } | undefined)?.units ?? [];
  const turn = isReplay ? replay.turnAt(replayStepIndex) : battle?.state?.currentTurn ?? 0;
  // Live battles run until win/pause/abort (Infinity — see docs/battles/lifecycle.md).
  // In replay we surface progress against the recorded event count.
  const maxTurns = isReplay && replayTotalEvents > 0 ? replayTotalEvents : undefined;

  // Live battles show their live events; replays show the replay manager's
  // stepped playback of the recorded event stream.
  const displayEvents = isReplay ? replayEvents : events;

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
          {isReplay ? (
            <ReplayControls
              total={replayTotalEvents}
              index={replayStepIndex}
              speed={replaySpeed}
              onPlay={() => replay.play()}
              onPause={() => replay.pause()}
              onStep={() => replay.step()}
              onStepBack={() => replay.stepBack()}
              onReset={() => {
                setReplayEvents([]);
                replay.reset();
              }}
              onSpeed={(s) => setReplaySpeed(s)}
            />
          ) : (
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
          )}
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
            <AgentRoster agents={agents} units={units} thinking={thinkingAgents} />
          </div>
          <PollPanel poll={poll} />
        </div>

        {/* Center: the selected game (rendered from the arena's renderState) */}
        <div className="space-y-3 order-1 lg:order-2">
          <div className="glass rounded-2xl p-3 lg:p-4">
            <GameView
              renderState={renderState}
              accent={accent}
              turn={turn}
              replay={isReplay}
              arenaSlug={arenaSlug}
            />
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

        {/* Right: tabs events / chat. Fixed height so the stream scrolls. */}
        <div className="order-3 glass rounded-2xl overflow-hidden h-[560px] lg:h-[560px] flex flex-col">
          <div className="flex border-b border-border">
            <TabBtn
              active={tab === 'events'}
              onClick={() => setTab('events')}
              icon="ListTree"
              label="Events"
              badge={displayEvents.length}
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
              <EventLog events={displayEvents} />
            ) : (
              <SpectatorChat battleId={battle.id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Spectator poll panel ---------------------------------------------- */

type PollData = ReturnType<typeof useBattlePolls>['poll'];

function PollPanel({ poll }: { poll: PollData }) {
  const total = poll.options.reduce((s, x) => s + x.votes, 0) || 1;
  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Icon name="ThumbsUp" size={13} className="text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Spectator Poll
        </span>
      </div>
      {poll.loading && poll.options.length === 0 && (
        <div className="text-[11px] text-muted-foreground py-3 text-center">Loading poll…</div>
      )}
      {poll.error && poll.options.length === 0 && (
        <div className="text-[11px] text-muted-foreground py-3 text-center">
          Poll unavailable
        </div>
      )}
      {poll.options.length > 0 && (
        <>
          <div className="text-xs text-foreground/80 mb-2">{poll.question}</div>
          <div className="space-y-1.5">
            {poll.options.map((o, i) => {
              const pct = Math.round((o.votes / total) * 100);
              return (
                <button
                  key={i}
                  onClick={() => poll.vote(i)}
                  disabled={poll.voted != null}
                  className="w-full text-left rounded-lg border border-border bg-card/40 px-2.5 py-1.5 hover:border-primary/40 transition-colors disabled:opacity-70"
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
        </>
      )}
    </div>
  );
}

/* ---- Replay transport controls ----------------------------------------- */

function ReplayControls(props: {
  total: number;
  index: number;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onStepBack: () => void;
  onReset: () => void;
  onSpeed: (s: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        <button
          onClick={props.onReset}
          className="p-1.5 rounded-md hover:bg-muted"
          aria-label="Reset"
        >
          <Icon name="RotateCcw" size={14} />
        </button>
        <button
          onClick={props.onStepBack}
          className="p-1.5 rounded-md hover:bg-muted"
          aria-label="Step back"
        >
          <Icon name="Rewind" size={14} />
        </button>
        <button
          onClick={props.onPlay}
          className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          aria-label="Play"
        >
          <Icon name="Play" size={14} />
        </button>
        <button
          onClick={props.onPause}
          className="p-1.5 rounded-md hover:bg-muted"
          aria-label="Pause"
        >
          <Icon name="Pause" size={14} />
        </button>
        <button
          onClick={props.onStep}
          className="p-1.5 rounded-md hover:bg-muted"
          aria-label="Step"
        >
          <Icon name="FastForward" size={14} />
        </button>
      </div>
      <div className="flex items-center gap-2 ml-1">
        <span className="font-mono text-[10px] text-muted-foreground">SPEED</span>
        <select
          value={props.speed}
          onChange={(e) => props.onSpeed(Number(e.target.value))}
          className="bg-muted/50 border border-border rounded px-2 py-1 text-xs font-mono outline-none text-foreground"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </div>
      <span className="font-mono text-[10px] text-muted-foreground ml-2">
        {props.index}/{props.total || 0}
      </span>
    </div>
  );
}

export default Battle;
