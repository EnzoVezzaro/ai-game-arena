import React, { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import { Field, Input, Select } from "@/components/Field";
import { PROVIDERS, providerMeta } from "@/lib/arena";
import { cn } from "@/lib/utils";

export default function AgentSettingsModal({ open, agent, onClose, onSave }) {
  const [provider, setProvider] = useState("base44");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [strategy, setStrategy] = useState("balanced");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open && agent) {
      setProvider(agent.provider || "base44");
      setModel(agent.model || "");
      setApiKey(agent.api_key || "");
      setStrategy(agent.strategy || "balanced");
      setTagline(agent.tagline || "");
      setDescription(agent.description || "");
      setSaved(false);
      setShowKey(false);
    }
  }, [open, agent]);

  const meta = providerMeta(provider);
  const modelOptions = (meta.models || []).map(m => ({ value: m, label: m }));

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({
        provider,
        model: model || (meta.models?.[0] || ""),
        api_key: apiKey,
        strategy,
        tagline,
        description
      });
      setSaved(true);
      setTimeout(onClose, 600);
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Agent Settings" sub={agent?.name} icon="Settings" accent={meta.color}
      footer={<>
        <button onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold disabled:opacity-50">
          <Icon name={saved ? "Check" : "Save"} size={13} /> {saving ? "Saving…" : saved ? "Saved" : "Save settings"}
        </button>
      </>}>
      {/* Provider picker */}
      <Field label="Provider" hint={meta.blurb}>
        <div className="mt-1.5 grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {Object.entries(PROVIDERS).map(([key, m]) => (
            <button key={key} onClick={() => { setProvider(key); if (!m.models?.includes(model)) setModel(""); }}
              className={cn("flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] font-medium transition-all",
                provider === key ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card/40 text-muted-foreground hover:text-foreground")}
              style={provider === key ? { color: m.color, borderColor: `${m.color}55`, background: `${m.color}14` } : undefined}>
              <Icon name={m.icon} size={15} style={{ color: m.color }} />
              {m.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Model">
          {meta.models?.length ? (
            <Select value={model} onChange={setModel} options={modelOptions} placeholder="Select model" />
          ) : (
            <Input value={model} onChange={setModel} placeholder="model identifier" />
          )}
        </Field>
        <Field label="Strategy">
          <Select value={strategy} onChange={setStrategy}
            options={[{ value: "aggressive", label: "Aggressive" }, { value: "defensive", label: "Defensive" }, { value: "scout", label: "Scout" }, { value: "llm", label: "LLM Reasoner" }, { value: "balanced", label: "Balanced" }]} />
        </Field>
      </div>

      {/* API key */}
      <Field label="API key" hint={meta.needsKey ? "Stored on the agent record — keep it private." : "Not required for the Base44-managed provider."}>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder={meta.needsKey ? "sk-…" : "— none needed —"}
              disabled={!meta.needsKey}
              className="w-full rounded-lg bg-input border border-border px-3 py-2 pr-9 text-sm font-mono outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
            />
            <button type="button" onClick={() => setShowKey(s => !s)} disabled={!meta.needsKey}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-primary disabled:opacity-40">
              <Icon name={showKey ? "EyeOff" : "Eye"} size={14} />
            </button>
          </div>
        </div>
        {apiKey && meta.needsKey && (
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-success">
            <Icon name="ShieldCheck" size={11} /> key configured
          </div>
        )}
      </Field>

      <Field label="Tagline"><Input value={tagline} onChange={setTagline} placeholder="Short agent blurb" /></Field>
      <Field label="Description"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="How this agent plays…" className="mt-1.5 w-full rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors resize-none" /></Field>
    </Modal>
  );
}