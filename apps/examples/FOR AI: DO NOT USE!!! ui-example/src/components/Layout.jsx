const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

import Icon from "@/components/Icon";
import LiveBadge from "@/components/LiveBadge";

const NAV = [
  { to: "/", label: "Overview", icon: "LayoutGrid" },
  { to: "/arenas", label: "Arenas", icon: "Swords" },
  { to: "/games", label: "Games", icon: "Gamepad2" },
  { to: "/battles", label: "Battles", icon: "Radio" },
  { to: "/leaderboard", label: "Leaderboard", icon: "Trophy" },
  { to: "/agents", label: "Agents", icon: "Bot" },
  { to: "/plugins", label: "Plugins", icon: "Puzzle" },
  { to: "/packages", label: "Packages", icon: "Package" }
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 border border-primary/40 flex items-center justify-center glow-primary overflow-hidden">
        <Icon name="Swords" size={18} className="text-primary" />
        <div className="absolute inset-0 arena-grid-bg opacity-40" />
      </div>
      <div className="leading-none">
        <div className="font-display font-bold text-[15px] tracking-tight">AI Game Arena</div>
        <div className="font-mono text-[9px] text-muted-foreground tracking-[0.2em] uppercase">runtime · v1</div>
      </div>
    </Link>
  );
}

function LiveTicker() {
  const [battles, setBattles] = useState([]);
  useEffect(() => {
    let on = true;
    db.entities.Battle.filter({ status: "running" }, "-created_date", 8)
      .then(b => { if (on) setBattles(b || []); })
      .catch(() => {});
    return () => { on = false; };
  }, []);
  if (!battles.length) return null;
  const items = [...battles, ...battles];
  return (
    <div className="relative overflow-hidden border-t border-border bg-card/40">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <LiveBadge status="running" />
        <div className="overflow-hidden flex-1">
          <div className="flex gap-6 animate-ticker whitespace-nowrap">
            {items.map((b, i) => (
              <Link key={i} to={`/battle/${b.id}`} className="font-mono text-[11px] text-muted-foreground hover:text-primary transition-colors">
                <span className="text-foreground/80">{b.name}</span>
                <span className="mx-2 text-border">·</span>
                <span>T{b.turn || 0}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 z-40 h-screen w-64 shrink-0 border-r border-border bg-card/60 backdrop-blur-xl flex flex-col transition-transform duration-300",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-5 border-b border-border">
          <Logo />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => {
            const active = loc.pathname === item.to || (item.to !== "/" && loc.pathname.startsWith(item.to));
            return (
              <Link key={item.to} to={item.to} className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                active ? "bg-primary/10 text-primary border border-primary/30 glow-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
              )}>
                <Icon name={item.icon} size={17} />
                <span className="font-medium">{item.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <div className="glass rounded-xl p-3">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Icon name="Wifi" size={13} className="text-success" />
              <span className="font-mono">Runtime online</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>6 plugins</span>
              <span className="text-success">●</span>
            </div>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 glass-strong border-b border-border">
          <div className="flex items-center gap-3 px-4 lg:px-6 h-14">
            <button onClick={() => setOpen(v => !v)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted/60">
              <Icon name="Layers" size={18} />
            </button>
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Icon name="Terminal" size={13} className="text-primary" />
              <span>spectator://arena</span>
              <span className="text-border">/</span>
              <span className="text-foreground/70">{loc.pathname === "/" ? "overview" : loc.pathname.slice(1)}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-1.5 w-56">
                <Icon name="Search" size={14} className="text-muted-foreground" />
                <input placeholder="Search arenas…" className="bg-transparent text-xs outline-none flex-1 placeholder:text-muted-foreground" />
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-2.5 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
                <span className="font-mono text-[10px] font-semibold text-success">LIVE</span>
              </div>
            </div>
          </div>
          <LiveTicker />
        </header>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}