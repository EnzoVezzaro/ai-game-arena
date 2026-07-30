const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

import Icon from "@/components/Icon";

const SPECTATORS = ["nova_42", "pixelghost", "deepwatch", "0xAria", "the_ref", "ml_mom", "grid_keeper", "vex"];
const CHATTER = [
  "that flank was wide open lol", "scout strat is cooking", "aggressive is gonna overextend",
  "watch the corner", "GG already?", "controller latency looks clean", "this model reasons fast",
  "retreat was smart", "nice prediction", "who trained this one?", "bots are getting scary"
];

export default function SpectatorChat({ battleId, className }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    let on = true;
    db.entities.ChatMessage.filter({ battle_id: battleId }, "created_date", 50)
      .then(m => { if (on) setMsgs(m || []); }).catch(() => {});
    const unsub = db.entities.ChatMessage.subscribe?.((ev) => {
      if (ev?.data?.battle_id === battleId) setMsgs(prev => [...prev, ev.data].slice(-60));
    });
    // ambient spectator chatter
    const t = setInterval(() => {
      if (Math.random() < 0.6) {
        const author = SPECTATORS[Math.floor(Math.random() * SPECTATORS.length)];
        const body = CHATTER[Math.floor(Math.random() * CHATTER.length)];
        const colors = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#f472b6"];
        const color = colors[Math.floor(Math.random() * colors.length)];
        setMsgs(prev => [...prev, { author_name: author, text: body, color, author_role: "spectator", _local: true }].slice(-60));
      }
    }, 4200);
    return () => { on = false; clearInterval(t); unsub && unsub(); };
  }, [battleId]);

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [msgs]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    const msg = { battle_id: battleId, author_name: "you", author_role: "spectator", text: t, color: "#38bdf8" };
    setMsgs(prev => [...prev, { ...msg, _local: true }].slice(-60));
    setText("");
    try { await db.entities.ChatMessage.create(msg); } catch {}
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Icon name="MessageSquare" size={13} className="text-accent" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Spectator Chat</span>
        <span className="ml-auto flex items-center gap-1 font-mono text-[10px] text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
          {rngViewers()}
        </span>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1.5">
        {msgs.map((m, i) => (
          <div key={i} className="text-[11px] leading-snug animate-fade-in">
            <span className="font-mono font-semibold" style={{ color: m.color || "#38bdf8" }}>{m.author_name}</span>
            <span className="text-border mx-1">:</span>
            <span className="text-foreground/80">{m.text}</span>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-border flex items-center gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Send a message…"
          className="flex-1 bg-muted/40 rounded-lg px-2.5 py-1.5 text-xs outline-none border border-transparent focus:border-primary/40 placeholder:text-muted-foreground"
        />
        <button onClick={send} className="rounded-lg bg-primary/15 border border-primary/40 p-1.5 text-primary hover:bg-primary/25 transition-colors">
          <Icon name="Send" size={14} />
        </button>
      </div>
    </div>
  );
}

function rngViewers() {
  return (240 + Math.floor(Math.random() * 80)).toString();
}