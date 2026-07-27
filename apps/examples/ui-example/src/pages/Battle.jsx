const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";

import { initBattleState, stepTurn } from "@/lib/battleEngine";
import { categoryMeta } from "@/lib/arena";
import ArenaGrid from "@/components/battle/ArenaGrid";
import EventLog from "@/components/battle/EventLog";
import SpectatorChat from "@/components/battle/SpectatorChat";
import AgentRoster from "@/components/battle/AgentRoster";
import TurnTimeline from "@/components/battle/TurnTimeline";
import BattleControls from "@/components/battle/BattleControls";
import PollPanel from "@/components/battle/PollPanel";
import LiveBadge from "@/components/LiveBadge";
import PageLoader from "@/components/PageLoader";
import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";

const POLL = {
  question: "Who wins this battle?",
  options: [
    { text: "The aggressor", votes: 142 },
    { text: "The defensive hold", votes: 88 },
    { text: "It ends in a draw", votes: 34 }
  ]
};

export default function Battle() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const arenaSlug = params.get("arena");
  const gameSlug = params.get("game");

  const [loading, setLoading] = useState(true);
  const [battle, setBattle] = useState(null);
  const [arena, setArena] = useState(null);
  const [game, setGame] = useState(null);
  const [agents, setAgents] = useState([]);
  const [engineState, setEngineState] = useState(null);
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("waiting");
  const [speed, setSpeed] = useState(1);
  const [tab, setTab] = useState("events");
  const [poll, setPoll] = useState(POLL);
  const [isReplay, setIsReplay] = useState(false);

  const engineRef = useRef(null);
  const statusRef = useRef("waiting");
  const speedRef = useRef(1);
  const battleRef = useRef(null);
  const agentsRef = useRef([]);

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { battleRef.current = battle; }, [battle]);
  useEffect(() => { agentsRef.current = agents; }, [agents]);

  // Initialize battle
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        let b, ar, gm, ags = [];
        let wasFinished = false;
        if (id) {
          b = await db.entities.Battle.get(id);
          ar = (await db.entities.Arena.filter({ slug: b.arena_slug }, "-created_date", 1))?.[0];
          gm = (await db.entities.Game.filter({ slug: b.game_slug }, "-created_date", 1))?.[0];
          const all = await db.entities.Agent.list("-rating", 100);
          ags = (b.agent_ids || []).map(aid => all.find(a => a.id === aid)).filter(Boolean);
          if (!ags.length) ags = (all || []).slice(0, 4);
          wasFinished = b.status === "finished" || b.status === "aborted";
          if (wasFinished) setIsReplay(true);
        } else {
          const aSlug = arenaSlug || "classic";
          const gSlug = gameSlug || "battle-tanks";
          ar = (await db.entities.Arena.filter({ slug: aSlug }, "-created_date", 1))?.[0];
          gm = (await db.entities.Game.filter({ slug: gSlug }, "-created_date", 1))?.[0];
          const all = await db.entities.Agent.list("-rating", 100);
          ags = (all || []).filter(a => a.is_active).slice(0, 4);
          if (ags.length < 2) ags = (all || []).slice(0, 4);
          b = await db.entities.Battle.create({
            name: `${ar?.name || "Arena"} · ${gm?.name || "Battle"} #${Math.floor(Math.random() * 9000) + 1000}`,
            arena_slug: aSlug, game_slug: gSlug,
            agent_ids: ags.map(a => a.id),
            status: "running", turn: 0, max_turns: 30,
            scores: ags.map(a => ({ agent_id: a.id, score: 0, hp: 100 })),
            config: { speed: 1 }
          });
        }
        if (!on) return;
        setBattle(b); setArena(ar); setGame(gm); setAgents(ags);
        battleRef.current = b; agentsRef.current = ags;
        const grid = gm?.grid_size || 8;
        const init = initBattleState(ags, grid);
        engineRef.current = init;
        setEngineState(init);
        const startEvents = [
          { battle_id: b.id, type: "MATCH_STARTED", turn: 0, summary: `${ar?.name || "Arena"} hosting ${gm?.name || "battle"} — ${ags.length} agents engaged`, payload: { arena: b.arena_slug, game: b.game_slug } },
          ...ags.map(a => ({ battle_id: b.id, type: "AGENT_JOINED", agent_id: a.id, turn: 0, summary: `${a.name} connected controller (MCP)`, payload: { strategy: a.strategy, model: a.model } }))
        ];
        setEvents(startEvents);
        try { await db.entities.BattleEvent.bulkCreate(startEvents); } catch {}
        const startStatus = wasFinished ? "paused" : "running";
        setStatus(startStatus); statusRef.current = startStatus;
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, arenaSlug, gameSlug]);

  const runTurn = useCallback(async () => {
    if (statusRef.current === "finished") return;
    const cur = engineRef.current;
    const ags = agentsRef.current;
    if (!cur || !ags.length) return;
    const { state, events: evs, finished, winnerId } = stepTurn(cur, ags);
    engineRef.current = state;
    setEngineState(state);
    setEvents(prev => [...prev, ...evs]);
    if (evs.length) {
      try { await db.entities.BattleEvent.bulkCreate(evs.map(e => ({ ...e, battle_id: battleRef.current?.id }))); } catch {}
    }
    const scores = state.units.map(u => ({ agent_id: u.agent_id, score: u.score, hp: u.hp }));
    if (finished) {
      setStatus("finished"); statusRef.current = "finished";
      try {
        await db.entities.Battle.update(battleRef.current.id, { turn: state.turn, scores, status: "finished", winner_agent_id: winnerId });
        setBattle(prev => prev ? { ...prev, turn: state.turn, scores, status: "finished", winner_agent_id: winnerId } : prev);
      } catch {}
    } else {
      try { await db.entities.Battle.update(battleRef.current.id, { turn: state.turn, scores, status: "running" }); } catch {}
      setBattle(prev => prev ? { ...prev, turn: state.turn, scores } : prev);
    }
  }, []);

  // simulation loop
  useEffect(() => {
    if (status !== "running") return;
    const interval = setInterval(() => { if (statusRef.current === "running") runTurn(); }, 1300 / speedRef.current);
    return () => clearInterval(interval);
  }, [status, speed, runTurn]);

  const play = () => { if (status === "finished") return reset(); setStatus("running"); statusRef.current = "running"; };
  const pause = () => { setStatus("paused"); statusRef.current = "paused"; };
  const reset = () => {
    const init = initBattleState(agents, game?.grid_size || 8);
    engineRef.current = init; setEngineState(init); setEvents([]); setStatus("running"); statusRef.current = "running";
  };

  if (loading) return <PageLoader label="Composing battle" />;
  if (!battle || !engineState) return <PageLoader label="Initializing" />;

  const cat = arena ? categoryMeta(arena.category) : null;
  const accent = arena?.accent_color || cat?.color || "#38bdf8";
  const scores = engineState.units.map(u => ({ agent_id: u.agent_id, score: u.score, hp: u.hp }));

  return (
    <div className="px-3 lg:px-6 py-4 max-w-[1500px] mx-auto">
      {/* Top bar */}
      <div className="glass-strong rounded-2xl p-3 lg:p-4 mb-3 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `${accent}22`, border: `1px solid ${accent}55` }}>{arena?.icon || "🎮"}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <LiveBadge status={status} />
              {isReplay && status !== "finished" && <span className="font-mono text-[9px] text-warning uppercase tracking-wider">replay</span>}
            </div>
            <h1 className="font-display font-bold text-sm lg:text-base truncate mt-0.5">{battle.name}</h1>
          </div>
          <div className="hidden md:flex items-center gap-2 ml-2">
            <Chip label={battle.arena_slug} icon="Swords" />
            <Chip label={battle.game_slug} icon="Gamepad2" />
          </div>
        </div>
        <BattleControls status={status} speed={speed} onPlay={play} onPause={pause} onStep={runTurn} onReset={reset} onSpeedChange={setSpeed} />
      </div>

      <div className="mb-3 glass rounded-xl px-4 py-2.5">
        <TurnTimeline turn={engineState.turn} maxTurns={battle.max_turns || 30} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_340px] gap-3">
        {/* Left: roster + poll */}
        <div className="space-y-3 order-2 lg:order-1">
          <div className="glass rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Icon name="Bot" size={13} className="text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Agent Roster</span>
            </div>
            <AgentRoster agents={agents} units={engineState.units} scores={scores} />
          </div>
          <PollPanel poll={poll} onVote={(i) => setPoll(p => ({ ...p, options: p.options.map((o, idx) => idx === i ? { ...o, votes: o.votes + 1 } : o) }))} />
        </div>

        {/* Center: arena grid + scoreboard */}
        <div className="space-y-3 order-1 lg:order-2">
          <div className="glass rounded-2xl p-3 lg:p-4">
            <ArenaGrid state={engineState} accent={accent} />
          </div>
          <Scoreboard agents={agents} units={engineState.units} finished={status === "finished"} />
        </div>

        {/* Right: tabs events / chat */}
        <div className="order-3 glass rounded-2xl overflow-hidden h-[420px] lg:h-auto lg:min-h-[560px] flex flex-col">
          <div className="flex border-b border-border">
            <TabBtn active={tab === "events"} onClick={() => setTab("events")} icon="ListTree" label="Events" badge={events.length} />
            <TabBtn active={tab === "chat"} onClick={() => setTab("chat")} icon="MessageSquare" label="Chat" />
          </div>
          <div className="flex-1 min-h-0">
            {tab === "events"
              ? <EventLog events={events} agents={agents} />
              : <SpectatorChat battleId={battle.id} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, icon }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
      <Icon name={icon} size={9} />{label}
    </span>
  );
}

function TabBtn({ active, onClick, icon, label, badge }) {
  return (
    <button onClick={onClick} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors relative",
      active ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground")}>
      <Icon name={icon} size={13} />{label}
      {badge != null && <span className="font-mono text-[9px] rounded bg-muted/60 px-1">{badge}</span>}
      {active && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
    </button>
  );
}

function Scoreboard({ agents, units, finished }) {
  const ranked = [...units].sort((a, b) => b.score - a.score);
  const winner = finished ? ranked[0] : null;
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="TrendingUp" size={13} className="text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Scoreboard</span>
        {finished && winner && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold" style={{ color: winner.color }}>
            <Icon name="Crown" size={13} className="text-warning" /> {winner.name} wins
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ranked.map((u, i) => {
          const a = agents.find(ag => ag.id === u.agent_id);
          if (!a) return null;
          return (
            <div key={u.agent_id} className={cn("rounded-xl border p-2.5 transition-all", finished && i === 0 ? "border-warning/40 bg-warning/5" : "border-border bg-card/40")}>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] text-muted-foreground">#{i + 1}</span>
                <div className="h-5 w-5 rounded flex items-center justify-center font-mono text-[9px] font-bold" style={{ background: `${u.color}33`, color: u.color }}>{u.symbol}</div>
                <span className="text-[11px] font-medium truncate">{a.name}</span>
              </div>
              <div className="mt-1.5 font-display text-xl font-bold" style={{ color: u.color }}>{u.score}</div>
              <div className="font-mono text-[9px] text-muted-foreground">dmg {u.damageDealt} · hp {u.hp}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}