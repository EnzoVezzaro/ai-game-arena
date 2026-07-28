import { useEffect, useMemo, useState } from 'react';
import { Modal, Field, Input, Select } from './Modal';
import { Icon } from '../../lib/Icon';
import { cn } from '../../lib/utils';

interface ArenaOption {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  description?: string;
}

interface AgentOption {
  id: string;
  name?: string;
  config?: { strategy?: string; provider?: { type?: string } | string };
}

export interface CreatedBattle {
  id: string;
  arenaId: string;
}

interface CreateBattleModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (battle: CreatedBattle) => void;
}

interface MatchConfig {
  maxTurns: number;
  turnTimeout: number;
  seed: number;
  deterministic: boolean;
}

const DEFAULT_MATCH: MatchConfig = {
  maxTurns: 100,
  turnTimeout: 30000,
  seed: 42,
  deterministic: true,
};

export function CreateBattleModal({ open, onClose, onCreated }: CreateBattleModalProps) {
  const [arenas, setArenas] = useState<ArenaOption[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [arenaId, setArenaId] = useState<string>('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [match, setMatch] = useState<MatchConfig>(DEFAULT_MATCH);
  const [autoStart, setAutoStart] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch('/api/arenas').then((r) => r.json()),
      fetch('/api/agents').then((r) => r.json()),
    ])
      .then(([a, ag]: [ArenaOption[], AgentOption[]]) => {
        setArenas(a ?? []);
        setAgents(ag ?? []);
        if (a && a.length > 0 && !arenaId) {
          const first = a[0];
          if (first) setArenaId(first.id);
        }
      })
      .catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedArena = useMemo(() => arenas.find((a) => a.id === arenaId), [arenas, arenaId]);

  const minP = selectedArena?.minPlayers ?? 2;
  const maxP = selectedArena?.maxPlayers ?? 4;
  const agentCountValid = selectedAgentIds.length >= minP && selectedAgentIds.length <= maxP;

  function toggleAgent(id: string) {
    setSelectedAgentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < maxP ? [...prev, id] : prev,
    );
  }

  async function handleCreate() {
    if (!arenaId || !agentCountValid) return;
    setCreating(true);
    setError(null);
    try {
      const arenaAgents = selectedAgentIds.map((id) => {
        const a = agents.find((x) => x.id === id);
        return {
          id,
          name: a?.name ?? id,
          strategy: a?.config?.strategy ?? 'balanced',
        };
      });
      const res = await fetch('/api/battles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arenaId,
          agents: arenaAgents,
          config: {
            maxTurns: match.maxTurns,
            turnTimeout: match.turnTimeout,
            seed: match.seed,
          },
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText);
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const battle = (await res.json()) as CreatedBattle;

      if (autoStart) {
        try {
          await fetch(`/api/battles/${battle.id}/start`, { method: 'POST' });
        } catch {
          /* battle created; start can be retried from the battle page */
        }
      }

      onCreated(battle);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New Battle"
      sub="Compose an arena, agents, and match config — then run it live"
      icon="Swords"
      accent="#38bdf8"
      footer={
        <>
          {error && (
            <span className="text-xs text-destructive mr-auto max-w-[60%] truncate">{error}</span>
          )}
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !arenaId || !agentCountValid}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon
              name={creating ? 'Loader' : 'Play'}
              size={14}
              className={creating ? 'animate-spin' : ''}
            />
            {creating ? 'Creating…' : autoStart ? 'Create & Start' : 'Create Battle'}
          </button>
        </>
      }
    >
      {arenas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No arenas registered. Register an arena plugin first.
        </p>
      ) : (
        <>
          <Field label="Arena" hint={selectedArena ? `${minP}-${maxP} players` : undefined}>
            <Select
              value={arenaId}
              onChange={setArenaId}
              options={arenas.map((a) => ({
                value: a.id,
                label: `${a.name} (${a.id})`,
              }))}
            />
          </Field>
          {selectedArena?.description && (
            <p className="text-[11px] text-muted-foreground -mt-1">{selectedArena.description}</p>
          )}

          <Field
            label="Agents"
            hint={
              selectedAgentIds.length === 0
                ? `pick ${minP}-${maxP}`
                : `${selectedAgentIds.length}/${maxP}${agentCountValid ? ' ✓' : ' ✗'}`
            }
          >
            <div className="rounded-lg border border-border bg-input/40 p-2 max-h-40 overflow-y-auto scrollbar-thin space-y-1">
              {agents.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">
                  No agents registered. Create some on the Agents page.
                </p>
              ) : (
                agents.map((a) => {
                  const checked = selectedAgentIds.includes(a.id);
                  const providerType =
                    typeof a.config?.provider === 'string'
                      ? a.config.provider
                      : a.config?.provider?.type;
                  return (
                    <label
                      key={a.id}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors',
                        checked ? 'bg-primary/15' : 'hover:bg-muted/40',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAgent(a.id)}
                        className="accent-primary h-3.5 w-3.5"
                      />
                      <span className="text-sm flex-1 truncate">{a.name ?? a.id}</span>
                      {a.config?.strategy && (
                        <span className="font-mono text-[9px] text-muted-foreground uppercase">
                          {a.config.strategy}
                        </span>
                      )}
                      {providerType && (
                        <span className="font-mono text-[9px] text-muted-foreground/70 uppercase">
                          {providerType}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
            {!agentCountValid && selectedAgentIds.length > 0 && (
              <p className="text-[11px] text-destructive mt-1">
                Need {minP}-{maxP} agents (have {selectedAgentIds.length}).
              </p>
            )}
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Max turns">
              <Input
                value={String(match.maxTurns)}
                onChange={(v) => setMatch((p) => ({ ...p, maxTurns: Number(v) || 0 }))}
                placeholder="100"
              />
            </Field>
            <Field label="Turn timeout (ms)">
              <Input
                value={String(match.turnTimeout)}
                onChange={(v) => setMatch((p) => ({ ...p, turnTimeout: Number(v) || 0 }))}
                placeholder="30000"
              />
            </Field>
            <Field label="Seed">
              <Input
                value={String(match.seed)}
                onChange={(v) => setMatch((p) => ({ ...p, seed: Number(v) || 0 }))}
                placeholder="42"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="accent-primary h-3.5 w-3.5"
            />
            <span className="text-xs text-muted-foreground">
              Start battle immediately after creation
            </span>
          </label>
        </>
      )}
    </Modal>
  );
}

export default CreateBattleModal;
