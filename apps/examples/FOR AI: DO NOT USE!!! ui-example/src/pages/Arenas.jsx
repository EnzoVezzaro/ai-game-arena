const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState, useMemo } from "react";

import ArenaCard from "@/components/ArenaCard";
import PageLoader from "@/components/PageLoader";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { Field, Input, TextArea, Select } from "@/components/Field";
import { ARENA_CATEGORIES, categoryMeta, slugify } from "@/lib/arena";
import { cn } from "@/lib/utils";

export default function Arenas() {
  const [arenas, setArenas] = useState([]);
  const [games, setGames] = useState([]);
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      db.entities.Arena.list("-created_date", 100),
      db.entities.Game.list("-created_date", 100).catch(() => []),
      db.entities.Plugin.list("-created_date", 100).catch(() => [])
    ]).then(([a, g, p]) => {
      setArenas(a || []);
      setGames(g || []);
      setPlugins(p || []);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const filtered = useMemo(() => arenas.filter(a =>
    (cat === "all" || a.category === cat) &&
    (!q || a.name?.toLowerCase().includes(q.toLowerCase()) || a.tagline?.toLowerCase().includes(q.toLowerCase()))
  ), [arenas, cat, q]);

  if (loading) return <PageLoader label="Loading arenas" />;

  return (
    <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">/ arenas · composable</div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Battle Environments</h1>
          <p className="text-sm text-muted-foreground mt-1">Arenas compose games + plugins into a hostable environment. The game is one installable component inside the arena.</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity glow-primary shrink-0">
          <Icon name="PackagePlus" size={16} /> Create Arena
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card/50 px-3 py-2 flex-1">
          <Icon name="Search" size={15} className="text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search arenas…" className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted-foreground" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <CatChip label="All" active={cat === "all"} onClick={() => setCat("all")} />
          {Object.entries(ARENA_CATEGORIES).map(([key, m]) => (
            <CatChip key={key} label={m.label} icon={m.icon} color={m.color} active={cat === key} onClick={() => setCat(key)} />
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(a => <ArenaCard key={a.id} arena={a} />)}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="Search" size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No arenas match your filters.</p>
        </div>
      )}

      <CreateArenaModal open={open} onClose={() => setOpen(false)} games={games} plugins={plugins} saving={saving} setSaving={setSaving}
        onCreate={async (data) => {
          setSaving(true);
          try { await db.entities.Arena.create(data); setOpen(false); load(); }
          finally { setSaving(false); }
        }} />
    </div>
  );
}

function CatChip({ label, icon, color, active, onClick }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium whitespace-nowrap transition-all",
      active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/30")}>
      {icon && <Icon name={icon} size={12} style={{ color }} />}
      {label}
    </button>
  );
}

function Toggle({ active, onClick, label }) {
  return (
    <button onClick={onClick} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all",
      active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card/40 text-muted-foreground hover:text-foreground")}>
      <Icon name={active ? "Check" : "Plus"} size={11} /> {label}
    </button>
  );
}

function CreateArenaModal({ open, onClose, games, plugins, onCreate, saving, setSaving }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("classic");
  const [accent, setAccent] = useState("#38bdf8");
  const [icon, setIcon] = useState("🎮");
  const [tagline, setTagline] = useState("");
  const [desc, setDesc] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [selGames, setSelGames] = useState([]);
  const [selPlugins, setSelPlugins] = useState([]);
  const [features, setFeatures] = useState("");

  const reset = () => { setName(""); setCategory("classic"); setAccent("#38bdf8"); setIcon("🎮"); setTagline(""); setDesc(""); setCapacity("4"); setSelGames([]); setSelPlugins([]); setFeatures(""); };
  const submit = () => {
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      slug: slugify(name),
      category,
      accent_color: accent,
      icon,
      tagline: tagline.trim(),
      description: desc.trim(),
      capacity: parseInt(capacity) || 4,
      game_slugs: selGames,
      plugins: selPlugins,
      features: features.split(",").map(s => s.trim()).filter(Boolean),
      is_featured: false
    });
    reset();
  };

  const cat = categoryMeta(category);
  return (
    <Modal open={open} onClose={onClose} title="Compose Arena" sub="Mount games and plugins into a hostable environment" icon="Swords" accent={accent}
      footer={<>
        <button onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
        <button onClick={submit} disabled={saving || !name.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold disabled:opacity-50">
          <Icon name="Save" size={13} /> {saving ? "Composing…" : "Create arena"}
        </button>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Arena name"><Input value={name} onChange={setName} placeholder="e.g. Neon Colosseum" /></Field>
        <Field label="Icon (emoji)"><Input value={icon} onChange={setIcon} placeholder="🎮" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Select value={category} onChange={setCategory} options={Object.entries(ARENA_CATEGORIES).map(([k, m]) => ({ value: k, label: m.label }))} />
        </Field>
        <Field label="Accent color"><Input value={accent} onChange={setAccent} placeholder="#38bdf8" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tagline"><Input value={tagline} onChange={setTagline} placeholder="One-line arena vibe" /></Field>
        <Field label="Capacity"><Input value={capacity} onChange={setCapacity} type="number" placeholder="4" /></Field>
      </div>
      <Field label="Description"><TextArea value={desc} onChange={setDesc} placeholder="What makes this arena distinct" /></Field>

      <Field label="Hosted games" hint={`${selGames.length} selected`}>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {games.length === 0 && <span className="text-xs text-muted-foreground">No games installed yet.</span>}
          {games.map(g => {
            const s = selGames.includes(g.slug);
            return <Toggle key={g.id} active={s} label={g.name} onClick={() => setSelGames(prev => s ? prev.filter(x => x !== g.slug) : [...prev, g.slug])} />;
          })}
        </div>
      </Field>
      <Field label="Loaded plugins" hint={`${selPlugins.length} selected`}>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {plugins.length === 0 && <span className="text-xs text-muted-foreground">No plugins installed yet.</span>}
          {plugins.map(p => {
            const s = selPlugins.includes(p.slug);
            return <Toggle key={p.id} active={s} label={p.name} onClick={() => setSelPlugins(prev => s ? prev.filter(x => x !== p.slug) : [...prev, p.slug])} />;
          })}
        </div>
      </Field>
      <Field label="Features" hint="Comma-separated"><Input value={features} onChange={setFeatures} placeholder="live-chat, polls, replays" /></Field>
    </Modal>
  );
}