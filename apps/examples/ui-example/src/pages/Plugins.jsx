const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState, useMemo } from "react";

import PluginCard from "@/components/PluginCard";
import PageLoader from "@/components/PageLoader";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import FileUpload from "@/components/FileUpload";
import { Field, Input, TextArea, Select } from "@/components/Field";
import { PLUGIN_CATEGORIES, pluginCategoryMeta, slugify } from "@/lib/arena";
import { cn } from "@/lib/utils";

export default function Plugins() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    db.entities.Plugin.list("-created_date", 100)
      .then(p => setPlugins(p || []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() => cat === "all" ? plugins : plugins.filter(p => p.category === cat), [plugins, cat]);
  const counts = useMemo(() => {
    const c = { all: plugins.length };
    Object.keys(PLUGIN_CATEGORIES).forEach(k => c[k] = plugins.filter(p => p.category === k).length);
    return c;
  }, [plugins]);

  const toggleInstall = async (p) => {
    const installed = (p.install_status || "installed") === "installed";
    await db.entities.Plugin.update(p.id, { install_status: installed ? "disabled" : "installed", is_active: installed ? false : true });
    setPlugins(prev => prev.map(x => x.id === p.id ? { ...x, install_status: installed ? "disabled" : "installed", is_active: installed ? false : true } : x));
  };
  const remove = async (p) => {
    await db.entities.Plugin.delete(p.id);
    setPlugins(prev => prev.filter(x => x.id !== p.id));
  };

  if (loading) return <PageLoader label="Loading plugins" />;

  return (
    <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">/ plugins · installable</div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Plugin Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">Every feature is a plugin — arenas, interactions, exporters, agents, visualizations, and metrics. Install or roll your own.</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity glow-primary shrink-0">
          <Icon name="PackagePlus" size={16} /> Create Plugin
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-6">
        <Chip label="All" count={counts.all} active={cat === "all"} onClick={() => setCat("all")} />
        {Object.entries(PLUGIN_CATEGORIES).map(([key, m]) => (
          <Chip key={key} label={m.label} icon={m.icon} color={m.color} count={counts[key]} active={cat === key} onClick={() => setCat(key)} />
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => <PluginCard key={p.id} plugin={p} onInstall={toggleInstall} onDelete={remove} />)}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="Puzzle" size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No plugins in this category. Build one and install it.</p>
        </div>
      )}

      <CreatePluginModal open={open} onClose={() => setOpen(false)} saving={saving} setSaving={setSaving}
        onCreate={async (data) => {
          setSaving(true);
          try { await db.entities.Plugin.create(data); setOpen(false); load(); }
          finally { setSaving(false); }
        }} />
    </div>
  );
}

function Chip({ label, icon, color, count, active, onClick }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium whitespace-nowrap transition-all",
      active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/30")}>
      {icon && <Icon name={icon} size={12} style={{ color }} />}
      {label}
      <span className={cn("font-mono text-[9px] rounded px-1", active ? "bg-primary/20" : "bg-muted/60")}>{count}</span>
    </button>
  );
}

function CreatePluginModal({ open, onClose, onCreate, saving, setSaving }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("arena");
  const [version, setVersion] = useState("1.0.0");
  const [icon, setIcon] = useState("🔌");
  const [author, setAuthor] = useState("");
  const [desc, setDesc] = useState("");
  const [contrib, setContrib] = useState("");
  const [bundle, setBundle] = useState("");

  const reset = () => { setName(""); setCategory("arena"); setVersion("1.0.0"); setIcon("🔌"); setAuthor(""); setDesc(""); setContrib(""); setBundle(""); };
  const submit = () => {
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      slug: slugify(name),
      category,
      version: version.trim() || "1.0.0",
      icon,
      author: author.trim(),
      description: desc.trim(),
      contributions: contrib.split(",").map(s => s.trim()).filter(Boolean),
      bundle_url: bundle,
      install_status: "installed",
      is_active: true
    });
    reset();
  };

  const cat = pluginCategoryMeta(category);
  return (
    <Modal open={open} onClose={onClose} title="Create Plugin" sub="An installable extension for the skeleton" icon="Puzzle" accent={cat.color}
      footer={<>
        <button onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
        <button onClick={submit} disabled={saving || !name.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold disabled:opacity-50">
          <Icon name="Save" size={13} /> {saving ? "Installing…" : "Install plugin"}
        </button>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Plugin name"><Input value={name} onChange={setName} placeholder="e.g. Crowd Meter" /></Field>
        <Field label="Version"><Input value={version} onChange={setVersion} placeholder="1.0.0" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Select value={category} onChange={setCategory} options={Object.entries(PLUGIN_CATEGORIES).map(([k, m]) => ({ value: k, label: m.label }))} />
        </Field>
        <Field label="Icon (emoji)"><Input value={icon} onChange={setIcon} placeholder="🔌" /></Field>
      </div>
      <Field label="Author"><Input value={author} onChange={setAuthor} placeholder="studio / handle" /></Field>
      <Field label="Description"><TextArea value={desc} onChange={setDesc} placeholder="What this plugin contributes" /></Field>
      <Field label="Contributions" hint="Comma-separated capabilities"><Input value={contrib} onChange={setContrib} placeholder="audience-meter, hype-wave" /></Field>
      <FileUpload value={bundle} onChange={setBundle} label="Plugin bundle" hint="JS/JSON module or zip" accent={cat.color} />
    </Modal>
  );
}