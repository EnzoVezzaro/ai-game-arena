const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState, useMemo } from "react";

import PackageCard from "@/components/PackageCard";
import PageLoader from "@/components/PageLoader";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import FileUpload from "@/components/FileUpload";
import { Field, Input, TextArea, Select } from "@/components/Field";
import { PACKAGE_TYPES, packageTypeMeta, slugify } from "@/lib/arena";
import { cn } from "@/lib/utils";

export default function Packages() {
  const [pkgs, setPkgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    db.entities.Package.list("-created_date", 100)
      .then(p => setPkgs(p || []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() => type === "all" ? pkgs : pkgs.filter(p => p.type === type), [pkgs, type]);
  const counts = useMemo(() => {
    const c = { all: pkgs.length };
    Object.keys(PACKAGE_TYPES).forEach(k => c[k] = pkgs.filter(p => p.type === k).length);
    return c;
  }, [pkgs]);

  const toggleInstall = async (p) => {
    const installed = (p.install_status || "staged") === "installed";
    await db.entities.Package.update(p.id, { install_status: installed ? "disabled" : "installed" });
    setPkgs(prev => prev.map(x => x.id === p.id ? { ...x, install_status: installed ? "disabled" : "installed" } : x));
  };
  const remove = async (p) => {
    await db.entities.Package.delete(p.id);
    setPkgs(prev => prev.filter(x => x.id !== p.id));
  };

  if (loading) return <PageLoader label="Loading packages" />;

  return (
    <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">/ packages · installer</div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Package Installer</h1>
          <p className="text-sm text-muted-foreground mt-1">Self-contained, installable bundles. Games, plugins, arenas — or composite bundles — dropped into the skeleton runtime.</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity glow-primary shrink-0">
          <Icon name="PackagePlus" size={16} /> Create Package
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-6">
        <TypeChip label="All" count={counts.all} active={type === "all"} onClick={() => setType("all")} />
        {Object.entries(PACKAGE_TYPES).map(([key, m]) => (
          <TypeChip key={key} label={m.label} icon={m.icon} color={m.color} count={counts[key]} active={type === key} onClick={() => setType(key)} />
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => <PackageCard key={p.id} pkg={p} onInstall={toggleInstall} onDelete={remove} />)}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="Package" size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No packages staged. Bundle a game, plugin, or arena to install it.</p>
        </div>
      )}

      <CreatePackageModal open={open} onClose={() => setOpen(false)} saving={saving} setSaving={setSaving}
        onCreate={async (data) => {
          setSaving(true);
          try { await db.entities.Package.create(data); setOpen(false); load(); }
          finally { setSaving(false); }
        }} />
    </div>
  );
}

function TypeChip({ label, icon, color, count, active, onClick }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium whitespace-nowrap transition-all",
      active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/30")}>
      {icon && <Icon name={icon} size={12} style={{ color }} />}
      {label}
      <span className={cn("font-mono text-[9px] rounded px-1", active ? "bg-primary/20" : "bg-muted/60")}>{count}</span>
    </button>
  );
}

function CreatePackageModal({ open, onClose, onCreate, saving, setSaving }) {
  const [name, setName] = useState("");
  const [ptype, setPtype] = useState("bundle");
  const [version, setVersion] = useState("1.0.0");
  const [icon, setIcon] = useState("📦");
  const [author, setAuthor] = useState("");
  const [desc, setDesc] = useState("");
  const [bundle, setBundle] = useState("");
  const [games, setGames] = useState("");
  const [plugins, setPlugins] = useState("");
  const [arenas, setArenas] = useState("");

  const reset = () => { setName(""); setPtype("bundle"); setVersion("1.0.0"); setIcon("📦"); setAuthor(""); setDesc(""); setBundle(""); setGames(""); setPlugins(""); setArenas(""); };
  const submit = () => {
    if (!name.trim()) return;
    const manifest = {
      games: games.split(",").map(s => s.trim()).filter(Boolean),
      plugins: plugins.split(",").map(s => s.trim()).filter(Boolean),
      arenas: arenas.split(",").map(s => s.trim()).filter(Boolean)
    };
    onCreate({
      name: name.trim(),
      slug: slugify(name),
      type: ptype,
      version: version.trim() || "1.0.0",
      icon,
      author: author.trim(),
      description: desc.trim(),
      bundle_url: bundle,
      manifest,
      install_status: "installed"
    });
    reset();
  };

  const t = packageTypeMeta(ptype);
  return (
    <Modal open={open} onClose={onClose} title="Create Package" sub="A distributable bundle installed into the skeleton" icon="PackagePlus" accent={t.color}
      footer={<>
        <button onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
        <button onClick={submit} disabled={saving || !name.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold disabled:opacity-50">
          <Icon name="Save" size={13} /> {saving ? "Installing…" : "Install package"}
        </button>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Package name"><Input value={name} onChange={setName} placeholder="e.g. Tank Pack" /></Field>
        <Field label="Version"><Input value={version} onChange={setVersion} placeholder="1.0.0" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select value={ptype} onChange={setPtype} options={Object.entries(PACKAGE_TYPES).map(([k, m]) => ({ value: k, label: m.label }))} />
        </Field>
        <Field label="Icon (emoji)"><Input value={icon} onChange={setIcon} placeholder="📦" /></Field>
      </div>
      <Field label="Author"><Input value={author} onChange={setAuthor} placeholder="studio / handle" /></Field>
      <Field label="Description"><TextArea value={desc} onChange={setDesc} placeholder="What does this package provide?" /></Field>
      <FileUpload value={bundle} onChange={setBundle} label="Package bundle" hint="Zip / tarball containing the installable artifacts" />
      <Field label="Manifest contents" hint="Comma-separated slugs the package declares">
        <div className="mt-1.5 space-y-2">
          <Input value={games} onChange={setGames} placeholder="games: battle-tanks, chess-royale" />
          <Input value={plugins} onChange={setPlugins} placeholder="plugins: crowd-meter, replay-exporter" />
          <Input value={arenas} onChange={setArenas} placeholder="arenas: classic-8, streamer-hub" />
        </div>
      </Field>
    </Modal>
  );
}