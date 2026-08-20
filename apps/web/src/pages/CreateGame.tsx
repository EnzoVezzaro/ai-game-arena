import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PROVIDER_ORDER, providerMeta } from '../lib/arena';
import { Icon } from '../lib/Icon';
import { Chip } from '../components/common/Chip';
import { Field, Input, Select } from '../components/common/Modal';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ProviderConfig {
  type: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
}

interface SavedArtifact {
  id: string;
  slug: string;
  name: string;
  status: string;
  published: boolean;
  playUrl: string;
}

const SUGGESTIONS = [
  'A neon Breakout with power-ups and 3 lives',
  'A snake game with speed boosts and obstacles',
  'A top-down 2-player tank duel on a single keyboard',
  'An asteroid shooter with waves and a shield pickup',
  'A minimalist flappy-style game with parallax clouds',
];

const EMPTY_PROVIDER: ProviderConfig = {
  type: 'ollama',
  baseUrl: 'http://localhost:11434',
  apiKey: undefined,
  model: '',
};

function extractHtml(text: string): string | null {
  const fence = text.match(/```html\s*([\s\S]*?)```/i);
  if (fence) return fence[1]!.trim();
  const raw = text.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
  return raw ? raw[0].trim() : null;
}

export function CreateGame() {
  const [provider, setProvider] = useState<ProviderConfig>(EMPTY_PROVIDER);
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastHtml, setLastHtml] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedArtifact | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to the latest message while streaming.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  const fetchModels = useCallback(async (ptype: string, baseUrl: string, apiKey?: string) => {
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
  }, []);

  function handleProviderChange(type: string) {
    const meta = providerMeta(type);
    setProvider((prev) => ({ ...prev, type, baseUrl: meta.defaultBaseUrl, model: '' }));
    setModels([]);
    setModelsError(null);
    if (meta.immediate) {
      void fetchModels(type, meta.defaultBaseUrl, undefined);
    }
  }

  function onApiKeyBlur() {
    const meta = providerMeta(provider.type);
    if (!meta.immediate && provider.apiKey && provider.baseUrl) {
      void fetchModels(provider.type, provider.baseUrl, provider.apiKey);
    }
  }

  const modelOptions = useMemo(() => {
    const list = models.length > 0 ? models : providerMeta(provider.type).models;
    return list.map((m) => ({ value: m, label: m }));
  }, [models, provider.type]);

  const canSend = !streaming && !!draft.trim() && !!provider.model;

  async function send(prompt: string) {
    const text = prompt.trim();
    if (!text || streaming) return;
    if (!provider.model) {
      setError('Select a model first.');
      return;
    }
    setError(null);

    const userMsg: ChatMessage = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setDraft('');
    setStreaming(true);
    setLastHtml(null);
    setSaved(null);
    setSaveError(null);
    setPublishError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    let acc = '';
    try {
      const res = await fetch('/api/game-generator/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          provider: { ...provider, apiKey: provider.apiKey || undefined },
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => res.statusText);
        throw new Error(detail || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: acc };
          return next;
        });
      }

      const html = extractHtml(acc);
      if (html) setLastHtml(html);
      else if (acc.trim()) {
        setError('Assistant replied but produced no HTML game block. Ask it to emit a ```html block.');
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setMessages((prev) => prev.slice(0, -1));
      } else {
        setError((err as Error).message);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return last && last.role === 'assistant' && last.content === '' ? prev.slice(0, -1) : prev;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function reset() {
    setMessages([]);
    setLastHtml(null);
    setSaved(null);
    setSaveError(null);
    setPublishError(null);
    setError(null);
  }

  async function install() {
    if (!lastHtml) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const name = lastUser?.content.slice(0, 60) || 'Generated Game';
    setSaving(true);
    setSaveError(null);
    setSaved(null);
    try {
      const res = await fetch('/api/game-generator/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: 'Generated by AI Game Arena',
          html: lastHtml,
          min_players: 1,
          max_players: 1,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => res.statusText);
        throw new Error(detail || `HTTP ${res.status}`);
      }
      const artifact = (await res.json()) as SavedArtifact;
      setSaved(artifact);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!saved) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/artifacts/${saved.id}/publish`, {
        method: 'POST',
        headers: { 'x-user': 'admin' },
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => res.statusText);
        throw new Error(detail || `HTTP ${res.status}`);
      }
      const updated = (await res.json()) as SavedArtifact;
      setSaved({ ...saved, published: updated.published });
    } catch (err) {
      setPublishError((err as Error).message);
    } finally {
      setPublishing(false);
    }
  }

  const meta = providerMeta(provider.type);
  const promptDisabled = !provider.model;

  return (
    <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl border"
          style={{ borderColor: `${meta.color}55`, background: `${meta.color}1a` }}
        >
          <Icon name="Sparkles" size={20} style={{ color: meta.color }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Create a Game</h1>
          <p className="text-xs text-muted-foreground">
            Chat with an AI agent that builds playable HTML5 games. Install to the arena or publish to the marketplace.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
        {/* Chat column */}
        <div className="flex flex-col rounded-2xl border border-border bg-card/60 backdrop-blur-xl overflow-hidden">
          <div
            className="flex-1 min-h-[420px] max-h-[60vh] overflow-auto scrollbar-thin p-5 space-y-4"
            ref={scrollRef}
          >
            {messages.length === 0 && !streaming && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-5 py-10">
                <div className="h-14 w-14 rounded-2xl border border-primary/30 bg-primary/10 flex items-center justify-center">
                  <Icon name="Gamepad2" size={26} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Describe a game</h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    The agent will design and write a complete, playable single-file HTML5 game. Iterate in chat, then install or publish.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-xl">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setDraft(s)}
                      className="text-xs rounded-lg border border-border bg-card/50 px-3 py-2 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] rounded-xl rounded-br-sm bg-primary/15 border border-primary/30 px-3.5 py-2.5 text-sm'
                      : 'max-w-[90%] rounded-xl rounded-bl-sm bg-muted/40 border border-border px-3.5 py-2.5 text-sm font-mono whitespace-pre-wrap leading-relaxed'
                  }
                >
                  {m.content || (streaming && i === messages.length - 1 ? '…' : '')}
                </div>
              </div>
            ))}

            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border p-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              placeholder={promptDisabled ? 'Select a model on the right →' : 'Describe the game you want…  (Enter to send)'}
              disabled={promptDisabled}
              rows={2}
              className="w-full resize-none rounded-lg bg-input/60 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary/60 transition-colors disabled:opacity-50"
            />
            <div className="mt-2 flex items-center gap-2">
              {streaming ? (
                <button
                  onClick={stop}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-card/50 px-3 py-1.5 text-xs hover:border-destructive/40 hover:text-destructive transition-colors"
                >
                  <Icon name="Square" size={12} />
                  Stop
                </button>
              ) : (
                <button
                  onClick={() => void send(draft)}
                  disabled={!canSend}
                  className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-medium disabled:opacity-40 hover:enabled:bg-primary/90 transition-colors"
                >
                  <Icon name="Send" size={12} />
                  Generate
                </button>
              )}
              {messages.length > 0 && (
                <button
                  onClick={reset}
                  disabled={streaming}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-card/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                >
                  <Icon name="RefreshCw" size={12} />
                  New
                </button>
              )}
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                {messages.length} msgs
              </span>
            </div>
          </div>
        </div>

        {/* Side panel: provider config + generated game actions */}
        <div className="space-y-4">
          {/* Provider config */}
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon name={meta.icon} size={14} style={{ color: meta.color }} />
              <h3 className="text-sm font-semibold">Agent Model</h3>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {PROVIDER_ORDER.map((p) => {
                  const pm = providerMeta(p);
                  const active = provider.type === p;
                  return (
                    <Chip
                      key={p}
                      label={pm.label}
                      icon={pm.icon}
                      color={pm.color}
                      active={active}
                      onClick={() => handleProviderChange(p)}
                    />
                  );
                })}
              </div>

              <Field label="Base URL">
                <Input
                  value={provider.baseUrl}
                  onChange={(v) => setProvider((prev) => ({ ...prev, baseUrl: v }))}
                  placeholder={meta.defaultBaseUrl}
                />
              </Field>

              {meta.needsKey && (
                <Field label="API Key">
                  <Input
                    type="password"
                    value={provider.apiKey ?? ''}
                    onChange={(v) => setProvider((prev) => ({ ...prev, apiKey: v || undefined }))}
                    onBlur={onApiKeyBlur}
                    placeholder="sk-…"
                  />
                </Field>
              )}

              <Field label="Model">
                {modelOptions.length > 0 ? (
                  <Select
                    value={provider.model}
                    onChange={(v) => setProvider((prev) => ({ ...prev, model: v }))}
                    options={modelOptions}
                  />
                ) : (
                  <Input
                    value={provider.model}
                    onChange={(v) => setProvider((prev) => ({ ...prev, model: v }))}
                    placeholder="model id"
                  />
                )}
              </Field>

              {modelsLoading && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                  <Icon name="Loader" size={11} className="animate-spin" />
                  fetching models…
                </div>
              )}
              {modelsError && <div className="text-[10px] text-destructive">{modelsError}</div>}
              {!meta.needsKey && provider.type === 'custom' && (
                <p className="text-[10px] text-muted-foreground">{meta.blurb}</p>
              )}
            </div>
          </div>

          {/* Generated game panel */}
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="MonitorPlay" size={14} className="text-primary" />
              <h3 className="text-sm font-semibold">Generated Game</h3>
              {lastHtml && (
                <span className="ml-auto text-[10px] font-mono text-success flex items-center gap-1">
                  <Icon name="Check" size={11} /> ready
                </span>
              )}
            </div>

            {!lastHtml && (
              <p className="text-xs text-muted-foreground">
                No game yet. Describe a game in the chat — the agent will emit a complete HTML5 game. It appears here for preview, install, and publish.
              </p>
            )}

            {lastHtml && (
              <div className="space-y-3">
                <iframe
                  title="game-preview"
                  srcDoc={lastHtml}
                  className="w-full h-48 rounded-lg border border-border bg-black"
                  sandbox="allow-scripts allow-pointer-lock"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={install}
                    disabled={saving || streaming}
                    className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:enabled:bg-primary/90 transition-colors"
                  >
                    <Icon name="Save" size={12} />
                    {saving ? 'Installing…' : saved ? 'Re-install' : 'Install'}
                  </button>
                  <a
                    href={saved ? saved.playUrl : '#'}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                      saved
                        ? 'border-border bg-card/50 hover:border-primary/40'
                        : 'border-border bg-card/50 opacity-40 pointer-events-none'
                    }`}
                  >
                    <Icon name="Play" size={12} />
                    Play
                  </a>
                  <button
                    onClick={publish}
                    disabled={!saved || publishing || saved?.published}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card/50 px-3 py-1.5 text-xs disabled:opacity-40 hover:enabled:border-primary/40 hover:enabled:text-foreground transition-colors"
                  >
                    <Icon name="Store" size={12} />
                    {saved?.published ? 'Published' : publishing ? 'Publishing…' : 'Publish'}
                  </button>
                </div>

                {saveError && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-[10px] text-destructive">
                    {saveError}
                  </div>
                )}
                {publishError && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-[10px] text-destructive">
                    {publishError}
                  </div>
                )}
                {saved && (
                  <div className="rounded-lg border border-border bg-muted/30 px-2.5 py-2 text-[10px] font-mono text-muted-foreground space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Icon name="Check" size={10} className="text-success" />
                      installed to <span className="text-foreground">games/{saved.slug}/</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Icon name="Tag" size={10} />
                      status: <span className="text-foreground">{saved.status}</span>
                    </div>
                    {saved.published && (
                      <div className="flex items-center gap-1.5">
                        <Icon name="Store" size={10} className="text-primary" />
                        published to marketplace
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateGame;
