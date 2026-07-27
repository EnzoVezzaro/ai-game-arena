const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState, useMemo } from "react";

import GameCard from "@/components/GameCard";
import PageLoader from "@/components/PageLoader";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import FileUpload from "@/components/FileUpload";
import { Field, Input, TextArea, Select } from "@/components/Field";
import { GAME_FORMATS, gameFormatMeta, slugify, SYSTEM_MANDATORY_CAPABILITIES } from "@/lib/arena";
import { cn } from "@/lib/utils";

const DEFAULT_TOOLS = [
  { name: "move", type: "action", description: "Move the agent one cell in a direction." },
  { name: "attack", type: "action", description: "Attack an adjacent enemy unit." },
  { name: "scan", type: "observation", description: "Reveal nearby cells and units." },
  { name: "pass", type: "action", description: "End the turn without acting." }
];

export default function Games() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fmt, setFmt] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    db.entities.Game.list("-created_date", 100)
      .then(g => setGames(g || []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() => fmt === "all" ? games : games.filter(g => (g.format || "html") === fmt), [games, fmt]);
  const counts = useMemo(() => {
    const c = { all: games.length };
    Object.keys(GAME_FORMATS).forEach(k => c[k] = games.filter(g => (g.format || "html") === k).length);
    return c;
  }, [games]);

  const toggleInstall = async (g) => {
    const installed = (g.install_status || "installed") === "installed";
    await db.entities.Game.update(g.id, { install_status: installed ? "disabled" : "installed" });
    setGames(prev => prev.map(x => x.id === g.id ? { ...x, install_status: installed ? "disabled" : "installed" } : x));
  };
  const remove = async (g) => {
    await db.entities.Game.delete(g.id);
    setGames(prev => prev.filter(x => x.id !== g.id));
  };

  if (loading) return <PageLoader label="Loading games" />;

  return (
    <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">/ games · installable</div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Game Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">Games are wrappers around any format — HTML5, Unity WebGL, canvas, DOM, embeds — exposing MCP <span className="text-foreground/80">controllers</span> that agents use to play like humans.</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity glow-primary shrink-0">
          <Icon name="PackagePlus" size={16} /> Create Game
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-6">
        <FmtChip label="All" count={counts.all} active={fmt === "all"} onClick={() => setFmt("all")} />
        {Object.entries(GAME_FORMATS).map(([key, m]) => (
          <FmtChip key={key} label={m.label} icon={m.icon} color={m.color} count={counts[key]} active={fmt === key} onClick={() => setFmt(key)} />
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(g => <GameCard key={g.id} game={g} onInstall={toggleInstall} onDelete={remove} />)}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="Gamepad2" size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No games in this format yet. Create one to wrap a build.</p>
        </div>
      )}

      <CreateGameModal open={open} onClose={() => setOpen(false)} saving={saving} setSaving={setSaving}
        onCreate={async (data) => {
          setSaving(true);
          try { await db.entities.Game.create(data); setOpen(false); load(); }
          finally { setSaving(false); }
        }} />
    </div>
  );
}

function FmtChip({ label, icon, color, count, active, onClick }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium whitespace-nowrap transition-all",
      active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/30")}>
      {icon && <Icon name={icon} size={12} style={{ color }} />}
      {label}
      <span className={cn("font-mono text-[9px] rounded px-1", active ? "bg-primary/20" : "bg-muted/60")}>{count}</span>
    </button>
  );
}

function CreateGameModal({ open, onClose, onCreate, saving, setSaving }) {
  const [name, setName] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [format, setFormat] = useState("html");
  const [grid, setGrid] = useState("8");
  const [minP, setMinP] = useState("2");
  const [maxP, setMaxP] = useState("4");
  const [icon, setIcon] = useState("🎮");
  const [desc, setDesc] = useState("");
  const [rules, setRules] = useState("");
  const [bundle, setBundle] = useState("");
  const [tools, setTools] = useState(DEFAULT_TOOLS.map(t => ({ ...t, mandatory: t.name === "move" })));

  const reset = () => { setName(""); setVersion("1.0.0"); setFormat("html"); setGrid("8"); setMinP("2"); setMaxP("4"); setIcon("🎮"); setDesc(""); setRules(""); setBundle(""); setTools(DEFAULT_TOOLS.map(t => ({ ...t, mandatory: t.name === "move" }))); };
  const submit = () => {
    if (!name.trim()) return;
    const cleaned = tools.filter(t => t.name.trim()).map(t => ({ name: t.name.trim(), type: t.type, description: t.description.trim(), mandatory: !!t.mandatory }));
    const mandatory = cleaned.filter(t => t.mandatory).map(t => t.name);
    onCreate({
      name: name.trim(),
      slug: slugify(name),
      version: version.trim() || "1.0.0",
      format,
      adapter: gameFormatMeta(format).adapter,
      grid_size: parseInt(grid) || 8,
      min_players: parseInt(minP) || 2,
      max_players: parseInt(maxP) || 4,
      icon,
      description: desc.trim(),
      rules: rules.trim(),
      bundle_url: bundle,
      entrypoint: bundle ? "index.html" : "",
      controller_schema: cleaned,
      mandatory_capabilities: mandatory,
      default_strategies: ["aggressive", "defensive", "scout"],
      install_status: "installed",
      capabilities: ["grid", "turn-based"]
    });
    reset();
  };

  return (
    <Modal open={open} onClose={onClose} title="Register a Game" sub="Wrap a build artifact and declare its MCP controller" icon="Gamepad2" accent="#38bdf8"
      footer={<>
        <button onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
        <button onClick={submit} disabled={saving || !name.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold disabled:opacity-50">
          <Icon name="Save" size={13} /> {saving ? "Installing…" : "Install into skeleton"}
        </button>
      </>}>
      <Field label="Game name"><Input value={name} onChange={setName} placeholder="e.g. Battle Tanks" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Version"><Input value={version} onChange={setVersion} placeholder="1.0.0" /></Field>
        <Field label="Format">
          <Select value={format} onChange={setFormat} options={Object.entries(GAME_FORMATS).map(([k, m]) => ({ value: k, label: m.label }))} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Min players"><Input value={minP} onChange={setMinP} type="number" placeholder="2" /></Field>
        <Field label="Max players"><Input value={maxP} onChange={setMaxP} type="number" placeholder="4" /></Field>
        <Field label="Grid size"><Input value={grid} onChange={setGrid} type="number" placeholder="8" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Icon (emoji)" hint="Shown on cards & arena"><Input value={icon} onChange={setIcon} placeholder="🎮" /></Field>
        <Field label="Description"><Input value={desc} onChange={setDesc} placeholder="Short blurb" /></Field>
      </div>
      <Field label="Rules (optional)"><TextArea value={rules} onChange={setRules} placeholder="Win condition, scoring…" /></Field>

      <FileUpload value={bundle} onChange={setBundle} label="Game bundle" hint="HTML5 build, Unity WebGL export, or zip" />

      {/* System-inherent capabilities — baked into the platform, not editable */}
      <div className="rounded-lg border border-success/30 bg-success/5 p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Icon name="ShieldCheck" size={11} className="text-success" />
          <span className="font-mono text-[9px] uppercase tracking-wider text-success">System capabilities</span>
          <span className="font-mono text-[8px] text-muted-foreground ml-auto">inherent · every agent</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {SYSTEM_MANDATORY_CAPABILITIES.map(c => (
            <span key={c.name} title={c.description} className="inline-flex items-center gap-0.5 rounded bg-success/10 px-1.5 py-0.5 font-mono text-[9px] text-success">
              <Icon name="Lock" size={8} /> {c.name}
            </span>
          ))}
        </div>
      </div>

      <Field label="Game capabilities (MCP tools)" hint="Mark mandatory (★) tools every agent needs to play; the rest are special skills, toggleable per agent">
        <div className="mt-1.5 space-y-2">
          {tools.map((t, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card/40 p-2">
              <button onClick={() => setTools(prev => prev.map((x, j) => j === i ? { ...x, mandatory: !x.mandatory } : x))} title={t.mandatory ? "Mandatory — required to play" : "Special — toggleable per agent"} className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 transition-colors" style={t.mandatory ? { background: "#fbbf2420", color: "#fbbf24" } : { background: "hsl(222 34% 16%)", color: "hsl(215 18% 58%)" }}>
                <Icon name={t.mandatory ? "Star" : "Circle"} size={12} />
              </button>
              <input value={t.name} onChange={e => setTools(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="tool name (move)" className="w-24 rounded-md bg-input border border-border px-2 py-1.5 text-xs outline-none font-mono" />
              <select value={t.type} onChange={e => setTools(prev => prev.map((x, j) => j === i ? { ...x, type: e.target.value } : x))} className="rounded-md bg-input border border-border px-2 py-1.5 text-xs outline-none">
                <option value="action">action</option>
                <option value="observation">observation</option>
                <option value="query">query</option>
              </select>
              <input value={t.description} onChange={e => setTools(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="description" className="flex-1 min-w-0 rounded-md bg-input border border-border px-2 py-1.5 text-xs outline-none" />
              <button onClick={() => setTools(prev => prev.filter((_, j) => j !== i))} className="p-1 text-muted-foreground hover:text-destructive"><Icon name="Minus" size={14} /></button>
            </div>
          ))}
          <button onClick={() => setTools(prev => [...prev, { name: "", type: "action", description: "", mandatory: false }])} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-primary hover:border-primary/40">
            <Icon name="Plus" size={13} /> Add tool
          </button>
        </div>
      </Field>
    </Modal>
  );
}