import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { cn } from '../lib/utils';
import { Icon } from '../lib/Icon';

const PROVIDER_TYPES = [
  { value: 'openai', label: 'OpenAI', defaultBaseUrl: 'https://api.openai.com/v1' },
  { value: 'anthropic', label: 'Anthropic', defaultBaseUrl: 'https://api.anthropic.com' },
  {
    value: 'google',
    label: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
  },
  { value: 'mistral', label: 'Mistral AI', defaultBaseUrl: 'https://api.mistral.ai/v1' },
  { value: 'groq', label: 'Groq', defaultBaseUrl: 'https://api.groq.com/openai/v1' },
  { value: 'openrouter', label: 'OpenRouter', defaultBaseUrl: 'https://openrouter.ai/api/v1' },
  { value: 'ollama', label: 'Ollama (Local)', defaultBaseUrl: 'http://localhost:11434' },
  { value: 'lmstudio', label: 'LM Studio', defaultBaseUrl: 'http://localhost:1234/v1' },
  { value: 'vllm', label: 'vLLM', defaultBaseUrl: 'http://localhost:1234/v1' },
  {
    value: 'custom',
    label: 'Custom (OpenAI-compatible)',
    defaultBaseUrl: 'http://localhost:8000/v1',
  },
] as const;

const STRATEGIES = ['aggressive', 'defensive', 'scout', 'custom'] as const;

interface Profile {
  id: string;
  name: string;
  data: {
    strategy?: string;
    backstory?: string;
    provider?: { type: string; baseUrl: string; apiKey?: string; model?: string };
    model?: string;
    apiKey?: string;
  };
}

interface ProfileForm {
  name: string;
  strategy: string;
  backstory: string;
  providerType: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

const EMPTY_FORM: ProfileForm = {
  name: '',
  strategy: 'custom',
  backstory: '',
  providerType: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: '',
};

const inputCls =
  'w-full px-3 py-2 bg-input/60 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors';
const selectCls = cn(inputCls, 'appearance-none cursor-pointer');

export function Profiles() {
  const { data: profiles, loading, refetch } = useApi<Profile[]>('/api/profiles');
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchModels = useCallback(
    async (providerType: string, baseUrl: string, apiKey?: string) => {
      if (!providerType || !baseUrl) return;
      setModelsLoading(true);
      setModelsError(null);
      try {
        const res = await fetch('/api/models/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: providerType, baseUrl, apiKey: apiKey || undefined }),
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

  useEffect(() => {
    if (form.baseUrl && form.providerType) {
      fetchModels(form.providerType, form.baseUrl, form.apiKey);
    }
  }, [form.providerType, form.baseUrl, form.apiKey, fetchModels]);

  function handleProviderChange(type: string) {
    const provider = PROVIDER_TYPES.find((p) => p.value === type);
    setForm((prev) => ({
      ...prev,
      providerType: type,
      baseUrl: provider?.defaultBaseUrl ?? '',
      model: '',
    }));
  }

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setModels([]);
  }

  function startEdit(profile: Profile) {
    setEditingId(profile.id);
    setForm({
      name: profile.name,
      strategy: profile.data.strategy ?? 'custom',
      backstory: profile.data.backstory ?? '',
      providerType: profile.data.provider?.type ?? 'openai',
      baseUrl: profile.data.provider?.baseUrl ?? '',
      apiKey: profile.data.provider?.apiKey ?? '',
      model: profile.data.model ?? profile.data.provider?.model ?? '',
    });
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        data: {
          strategy: form.strategy,
          backstory: form.backstory || undefined,
          provider: {
            type: form.providerType,
            baseUrl: form.baseUrl,
            apiKey: form.apiKey || undefined,
            model: form.model,
          },
          model: form.model,
          apiKey: form.apiKey || undefined,
        },
      };

      if (editingId) {
        await fetch(`/api/profiles/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setEditingId(null);
      setForm(EMPTY_FORM);
      refetch();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
    if (editingId === id) {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    refetch();
  }

  return (
    <div className="px-4 lg:px-8 py-8 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
            / profiles
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Agent Profiles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure AI providers, strategies, and backstories for your agents.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity glow-primary shrink-0"
        >
          <Icon name="Plus" size={16} /> New Profile
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Profile list */}
        <div>
          {loading ? (
            <div className="text-muted-foreground text-sm">Loading profiles…</div>
          ) : !profiles || profiles.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">
              No profiles yet. Create one to configure an AI agent provider.
            </div>
          ) : (
            <div className="space-y-2">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={cn(
                    'glass rounded-xl border p-4 cursor-pointer transition-all',
                    editingId === profile.id
                      ? 'border-primary/40 glow-primary'
                      : 'border-border hover:border-primary/30',
                  )}
                  onClick={() => startEdit(profile)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm">{profile.name}</span>
                        <span className="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground uppercase">
                          {profile.data.provider?.type ?? 'none'}
                        </span>
                        <span className="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground uppercase">
                          {profile.data.model ?? 'no model'}
                        </span>
                      </div>
                      {profile.data.backstory && (
                        <p className="text-muted-foreground text-xs mt-1 truncate">
                          {profile.data.backstory}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(profile.id);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    >
                      <Icon name="Trash2" size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit form */}
        <div className="glass rounded-2xl p-5 h-fit lg:sticky lg:top-4">
          <div className="flex items-center gap-2 mb-4">
            <Icon name={editingId ? 'Save' : 'Plus'} size={14} className="text-primary" />
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {editingId ? 'Edit Profile' : 'New Profile'}
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. GPT-4 Strategist"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                Strategy
              </label>
              <select
                value={form.strategy}
                onChange={(e) => setForm((prev) => ({ ...prev, strategy: e.target.value }))}
                className={selectCls}
              >
                {STRATEGIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                Provider
              </label>
              <select
                value={form.providerType}
                onChange={(e) => handleProviderChange(e.target.value)}
                className={selectCls}
              >
                {PROVIDER_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                Base URL
              </label>
              <input
                type="text"
                value={form.baseUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="http://localhost:11434"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                API Key
              </label>
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                placeholder={form.providerType === 'ollama' ? 'Not required for local' : 'sk-...'}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                Model{' '}
                {modelsLoading && <span className="text-muted-foreground/70">(loading…)</span>}
              </label>
              <select
                value={form.model}
                onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
                className={selectCls}
                disabled={modelsLoading}
              >
                <option value="">
                  {modelsLoading
                    ? 'Loading models…'
                    : models.length
                      ? 'Select a model'
                      : 'No models found'}
                </option>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {modelsError && <p className="text-xs text-destructive mt-1">{modelsError}</p>}
              <button
                onClick={() => fetchModels(form.providerType, form.baseUrl, form.apiKey)}
                className="mt-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              >
                Refresh models
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                Backstory (optional)
              </label>
              <textarea
                value={form.backstory}
                onChange={(e) => setForm((prev) => ({ ...prev, backstory: e.target.value }))}
                placeholder="A brief backstory for this agent profile…"
                rows={3}
                className={cn(inputCls, 'resize-none')}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              <Icon name="Save" size={14} />
              {saving ? 'Saving…' : editingId ? 'Update Profile' : 'Create Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
