import { useCallback, useEffect, useMemo, useState } from 'react';
import { STRATEGIES, PROVIDER_ORDER, providerMeta } from '../lib/arena';
import { Icon } from '../lib/Icon';
import { PageLoader } from '../components/common/PageLoader';
import { AgentCard, type Agent } from '../components/common/AgentCard';
import { Chip } from '../components/common/Chip';
import { Modal, Field, Input, TextArea, Select } from '../components/common/Modal';

interface AgentApi {
  id: string;
  name?: string;
  config?: Record<string, unknown>;
}

interface AgentForm {
  name: string;
  strategy: string;
  providerType: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  backstory: string;
}

const EMPTY_FORM: AgentForm = {
  name: '',
  strategy: 'llm',
  providerType: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: '',
  backstory: '',
};

function mapAgent(a: AgentApi): Agent {
  const cfg = (a.config || {}) as {
    strategy?: string;
    model?: string;
    provider?: { type?: string } | string;
    backstory?: string;
  };
  const provider =
    typeof cfg.provider === 'string' ? cfg.provider : cfg.provider?.type;
  return {
    id: a.id,
    slug: a.id,
    name: a.name,
    strategy: cfg.strategy,
    model: cfg.model,
    provider,
    description: cfg.backstory,
    config: a.config,
  };
}

export function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [strat, setStrat] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<AgentForm>(EMPTY_FORM);
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadAgents = useCallback(() => {
    setLoading(true);
    fetch('/api/agents')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: AgentApi[]) => setAgents((list || []).map(mapAgent)))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const filtered = useMemo(
    () => (strat === 'all' ? agents : agents.filter((a) => a.strategy === strat)),
    [agents, strat],
  );

  const fetchModels = useCallback(
    async (ptype: string, baseUrl: string, apiKey?: string) => {
      if (!baseUrl) {
        setModels([]);
        return;
      }
      setModelsLoading(true);
      setModelsError(null);
      try {
        const res = await fetch('/api/models/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: ptype, baseUrl, apiKey: apiKey || undefined }),
        });
        const data = (await res.json()) as { models?: string[]; error?: string };
        if (data.error) setModelsError(data.error);
        setModels(data.models ?? []);
      } catch (err) {
        setModelsError((err as Error).message);
        setModels([]);
      } finally {
        setModelsLoading(false);
      }
    },
    [],
  );

  // On provider change: set baseUrl + immediately fetch for local providers.
  function handleProviderChange(type: string) {
    const meta = providerMeta(type);
    setForm((prev) => ({ ...prev, providerType: type, baseUrl: meta.defaultBaseUrl, model: '' }));
    setModels([]);
    setModelsError(null);
    if (meta.immediate) {
      void fetchModels(type, meta.defaultBaseUrl, undefined);
    }
  }

  function onApiKeyBlur() {
    const meta = providerMeta(form.providerType);
    if (!meta.immediate && form.apiKey && form.baseUrl) {
      void fetchModels(form.providerType, form.baseUrl, form.apiKey);
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setModels([]);
    setModelsError(null);
    setSaveError(null);
    setShowCreate(true);
    // immediate fetch for default openai? No — openai needs key. Default to openai, no fetch.
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const config = {
        strategy: form.strategy,
        provider: {
          type: form.providerType,
          baseUrl: form.baseUrl,
          apiKey: form.apiKey || undefined,
          model: form.model,
        },
        model: form.model,
        apiKey: form.apiKey || undefined,
        backstory: form.backstory || undefined,
      };
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), config }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText);
        throw new Error(txt || `HTTP ${res.status}`);
      }
      setShowCreate(false);
      loadAgents();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader label="Loading agents" />;

  const providerMetaActive = providerMeta(form.providerType);

  return (
    <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
            / agents
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">AI Competitors</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each agent observes the world, reasons, and manipulates its controller — never the game
            directly.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity glow-primary shrink-0"
        >
          <Icon name="Plus" size={16} /> New Agent
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-6">
        <Chip label="All" active={strat === 'all'} onClick={() => setStrat('all')} />
        {Object.entries(STRATEGIES).map(([k, m]) => (
          <Chip
            key={k}
            label={m.label}
            icon={m.icon}
            color={m.color}
            active={strat === k}
            onClick={() => setStrat(k)}
          />
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((a) => (
          <AgentCard key={a.id} agent={a} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="Bot" size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No agents registered yet. Create one above.</p>
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Agent"
        sub="Register a new AI competitor with a provider + model"
        icon="Plus"
        accent={providerMetaActive.color}
        footer={
          <>
            {saveError && <span className="text-xs text-destructive mr-auto">{saveError}</span>}
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="Save" size={14} />
              {saving ? 'Creating…' : 'Create Agent'}
            </button>
          </>
        }
      >
        <Field label="Name">
          <Input
            value={form.name}
            onChange={(v) => setForm((p) => ({ ...p, name: v }))}
            placeholder="e.g. Sonnet Strategist"
          />
        </Field>

        <Field label="Strategy">
          <Select
            value={form.strategy}
            onChange={(v) => setForm((p) => ({ ...p, strategy: v }))}
            options={Object.entries(STRATEGIES).map(([k, m]) => ({ value: k, label: m.label }))}
          />
        </Field>

        <Field label="Provider" hint={providerMetaActive.blurb}>
          <Select
            value={form.providerType}
            onChange={handleProviderChange}
            options={PROVIDER_ORDER.map((k) => ({ value: k, label: providerMeta(k).label }))}
          />
        </Field>

        <Field label="Base URL">
          <Input
            value={form.baseUrl}
            onChange={(v) => setForm((p) => ({ ...p, baseUrl: v }))}
            placeholder={providerMetaActive.defaultBaseUrl}
          />
        </Field>

        {!providerMetaActive.immediate && (
          <Field label="API Key">
            <Input
              type="password"
              value={form.apiKey}
              onChange={(v) => setForm((p) => ({ ...p, apiKey: v }))}
              onBlur={onApiKeyBlur}
              placeholder="sk-…"
            />
          </Field>
        )}

        <Field
          label="Model"
          hint={modelsLoading ? 'loading…' : models.length ? `${models.length} available` : undefined}
        >
          <div className="flex items-center gap-2">
            <Select
              value={form.model}
              onChange={(v) => setForm((p) => ({ ...p, model: v }))}
              options={[
                {
                  value: '',
                  label: modelsLoading
                    ? 'Loading models…'
                    : models.length
                      ? 'Select a model'
                      : providerMetaActive.immediate
                        ? 'No models found'
                        : 'Enter API key to load',
                },
                ...models.map((m) => ({ value: m, label: m })),
              ]}
            />
            <button
              type="button"
              onClick={() =>
                fetchModels(form.providerType, form.baseUrl, form.apiKey || undefined)
              }
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-muted/40 text-muted-foreground hover:text-foreground text-xs"
              title="Refresh models"
            >
              <Icon name="RefreshCw" size={12} />
            </button>
          </div>
          {modelsError && <p className="text-[11px] text-destructive mt-1">{modelsError}</p>}
          {!providerMetaActive.immediate && !form.apiKey && (
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">
              Tab/click out of the API key field to load models.
            </p>
          )}
        </Field>

        <Field label="Backstory">
          <TextArea
            value={form.backstory}
            onChange={(v) => setForm((p) => ({ ...p, backstory: v }))}
            placeholder="A brief persona for this agent…"
            rows={3}
          />
        </Field>
      </Modal>
    </div>
  );
}

export default Agents;
