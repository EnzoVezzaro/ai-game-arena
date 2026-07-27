import React from "react";
import { cn } from "@/lib/utils";
import { gameFormatMeta, installStatusMeta, SYSTEM_MANDATORY_CAPABILITIES } from "@/lib/arena";
import Icon from "@/components/Icon";

export default function GameCard({ game, onInstall, onDelete }) {
  const fmt = gameFormatMeta(game.format);
  const st = installStatusMeta(game.install_status || "installed");
  const tools = (game.controller_schema || []).filter(t => t.name);
  const mandatoryNames = new Set([
    ...(game.mandatory_capabilities || []),
    ...tools.filter(t => t.mandatory).map(t => t.name)
  ]);
  const mandatoryTools = tools.filter(t => mandatoryNames.has(t.name));
  const specialTools = tools.filter(t => !mandatoryNames.has(t.name));
  const installed = (game.install_status || "installed") === "installed";
  const players = `${game.min_players || 2}–${game.max_players || 4}`;

  return (
    <div className={cn("group relative rounded-2xl glass p-4 transition-all hover:border-primary/40", installed ? "" : "opacity-75")}>
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `${fmt.color}1a`, border: `1px solid ${fmt.color}40` }}>
          {game.icon || "🎮"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{game.name}</h4>
            <span className="font-mono text-[9px] text-muted-foreground shrink-0">v{game.version || "1.0.0"}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{game.description}</p>
          <div className="mt-1 flex items-center gap-2 font-mono text-[9px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Icon name="Users" size={9} /> {players}</span>
            <span className="inline-flex items-center gap-1"><Icon name="Grid3x3" size={9} /> {(game.grid_size || 8)}×{(game.grid_size || 8)}</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase shrink-0" style={{ color: st.color, background: `${st.color}18` }} title={st.label}>
          <Icon name={st.icon} size={9} />
        </span>
      </div>

      {/* Three-tier capability model */}
      <div className="mt-3 space-y-1.5">
        <Tier label="System" icon="ShieldCheck" color="#34d399" hint="inherent" tools={SYSTEM_MANDATORY_CAPABILITIES.map(c => c.name)} locked />
        {mandatoryTools.length > 0 && (
          <Tier label="Mandatory" icon="Star" color="#fbbf24" hint="required to play" tools={mandatoryTools.map(t => t.name)} locked />
        )}
        {specialTools.length > 0 && (
          <Tier label="Special" icon="Circle" color="#a78bfa" hint="toggleable per agent" tools={specialTools.map(t => t.name)} />
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider" style={{ color: fmt.color, background: `${fmt.color}14` }}>
          <Icon name={fmt.icon} size={10} /> {fmt.label}
        </span>
        {game.bundle_url && <span className="inline-flex items-center gap-0.5 rounded-md bg-success/10 text-success px-1.5 py-0.5 font-mono text-[9px]"><Icon name="Box" size={9} /> bundle</span>}
      </div>

      {(onInstall || onDelete) && (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5">
          {onInstall && (
            <button onClick={() => onInstall(game)} className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors", installed ? "bg-muted/40 text-muted-foreground hover:text-foreground" : "bg-primary/15 text-primary hover:bg-primary/25")}>
              <Icon name={installed ? "PowerOff" : "Power"} size={11} /> {installed ? "Uninstall" : "Install"}
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(game)} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-muted-foreground hover:text-destructive transition-colors">
              <Icon name="Trash2" size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Tier({ label, icon, color, hint, tools, locked }) {
  return (
    <div className="rounded-lg border border-border bg-card/30 px-2 py-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon name={icon} size={10} style={{ color }} />
        <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color }}>{label}</span>
        <span className="font-mono text-[8px] text-muted-foreground">· {hint}</span>
        {locked && <Icon name="Lock" size={8} className="text-muted-foreground/60 ml-auto" />}
      </div>
      <div className="flex flex-wrap gap-1">
        {tools.map((t, i) => (
          <span key={i} className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{t}</span>
        ))}
      </div>
    </div>
  );
}