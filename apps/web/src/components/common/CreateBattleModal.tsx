import { useEffect, useMemo, useState } from 'react';
import { Modal, Field, Select } from './Modal';
import { Icon } from '../../lib/Icon';
import { cn } from '../../lib/utils';

interface ArenaListItem {
  id: string;
  name: string;
  description?: string;
  minPlayers: number;
  maxPlayers: number;
}

interface ArenaDetail extends ArenaListItem {
  gameId?: string;
  defaultStrategies: string[];
  mandatoryCapabilities: string[];
  plugins: string[];
  ui: Array<{ id: string; type: string; component: string; label: string; position: string }>;
}

interface GameSummary {
  id: string;
  name: string;
  version: string;
  description?: string;
  category?: string;
  format?: string;
  icon?: string;
  min_players?: number;
  max_players?: number;
  grid_size?: number;
  capabilities: string[];
  mandatoryCapabilities: string[];
  defaultStrategies: string[];
  plugins: string[];
  ui: Array<{ id: string; type: string; component: string; label: string; position: string }>;
  path: string;
}

interface AgentOption {
  id: string;
  name?: string;
  config?: { strategy?: string; provider?: { type?: string } | string };
}

export interface CreatedBattle {
  id: string;
  arenaId: string;
  gameId?: string;
}

interface CreateBattleModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (battle: CreatedBattle) => void;
}

export function CreateBattleModal({ open, onClose, onCreated }: CreateBattleModalProps) {
  const [arenas, setArenas] = useState<ArenaListItem[]>([]);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [arenaId, setArenaId] = useState<string>('');
  const [arenaDetail, setArenaDetail] = useState<ArenaDetail | null>(null);
  const [gameId, setGameId] = useState<string>('');
  const [game, setGame] = useState<GameSummary | null>(null);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [autoStart, setAutoStart] = useState(true);
  const [creating, setCreating] = useState(false);
  const [checkingAgents, setCheckingAgents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load: arenas, games, agents.
  useEffect(() => {
    if (!open) return;
    setArenaId('');
    setGameId('');
    setSelectedAgentIds([]);
    setAutoStart(true);
    setCreating(false);
    setError(null);
    Promise.all([
      fetch('/api/arenas').then((r) => r.json()),
      fetch('/api/games').then((r) => r.json()),
      fetch('/api/agents').then((r) => r.json()),
    ])
      .then(([a, g, ag]: [ArenaListItem[], GameSummary[], AgentOption[]]) => {
        setArenas(a ?? []);
        setGames(g ?? []);
        setAgents(ag ?? []);
        if (a?.length) setArenaId(a[0]!.id);
      })
      .catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // When arena selection changes, fetch arena detail (game + strategies + caps).
  useEffect(() => {
    if (!arenaId) {
      setArenaDetail(null);
      return;
    }
    let on = true;
    fetch(`/api/arenas/${arenaId}`)
      .then((r) => r.json())
      .then((d: ArenaDetail) => {
        if (!on) return;
        setArenaDetail(d);
        // Preselect the arena's declared game, if any.
        if (d.gameId && !gameId) setGameId(d.gameId);
      })
      .catch(() => on && setArenaDetail(null));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arenaId]);

  // When game selection changes, resolve game summary.
  useEffect(() => {
    if (!gameId) {
      setGame(null);
      return;
    }
    // First try already-loaded list.
    const cached = games.find((g) => g.id === gameId) ?? null;
    setGame(cached);
  }, [gameId, games]);

  const selectedArena = useMemo(
    () => arenas.find((a) => a.id === arenaId) ?? null,
    [arenas, arenaId],
  );

  const minP = game?.min_players ?? selectedArena?.minPlayers ?? arenaDetail?.minPlayers ?? 2;
  const maxP = game?.max_players ?? selectedArena?.maxPlayers ?? arenaDetail?.maxPlayers ?? 4;
  const agentCountValid = selectedAgentIds.length >= minP && selectedAgentIds.length <= maxP;

  function toggleAgent(id: string) {
    setSelectedAgentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < maxP ? [...prev, id] : prev,
    );
  }

  function handleSelectArena(id: string) {
    setArenaId(id);
    setGameId('');
    setSelectedAgentIds([]);
    setArenaDetail(null);
    setGame(null);
  }

  function handleSelectGame(id: string) {
    setGameId(id);
    setSelectedAgentIds([]);
  }

  async function handleCreate() {
    if (!arenaId || !agentCountValid) return;
    setCreating(true);
    setError(null);
    try {
      setCheckingAgents(true);
      const healthRes = await fetch('/api/agents-health/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentIds: selectedAgentIds }),
      });
      setCheckingAgents(false);
      if (!healthRes.ok) {
        const txt = await healthRes.text().catch(() => healthRes.statusText);
        throw new Error(txt || `Health check failed: HTTP ${healthRes.status}`);
      }
      const health = (await healthRes.json()) as {
        ok: boolean;
        results: Array<{ agentId: string; ok: boolean; error?: string; providerType?: string }>;
      };
      if (!health.ok) {
        const failed = health.results.filter((r) => !r.ok);
        const messages = failed.map((r) => {
          const provider = r.providerType ? ` (${r.providerType})` : '';
          return `Agent ${r.agentId}${provider}: ${r.error}`;
        });
        throw new Error(`Agent health check failed: ${messages.join('; ')}`);
      }

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
          gameId: gameId || undefined,
          agents: arenaAgents,
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
      setCheckingAgents(false);
    }
  }

  function handleClose() {
    setError(null);
    setCreating(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New Battle"
      sub="Compose an arena with a game and agents — then run it live"
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
            disabled={creating || checkingAgents || !arenaId || !agentCountValid}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon
              name={creating || checkingAgents ? 'Loader' : 'Play'}
              size={14}
              className={creating || checkingAgents ? 'animate-spin' : ''}
            />
            {checkingAgents
              ? 'Checking agents…'
              : creating
                ? 'Creating…'
                : autoStart
                  ? 'Create & Start'
                  : 'Create Battle'}
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
          {/* ---- Arena select + info ---- */}
          <Field label="Arena" hint={selectedArena ? `${minP}-${maxP} players` : undefined}>
            <Select
              value={arenaId}
              onChange={handleSelectArena}
options={arenas.map((a) => ({
  value: a.id,
  label: a.name,
}))}
            />
          </Field>

          {arenaDetail && <ArenaInfoCard detail={arenaDetail} />}

          {/* ---- Game select + info ---- */}
          <Field label="Game" hint={!gameId ? 'optional' : game ? `v${game.version}` : undefined}>
            <Select
              value={gameId}
              onChange={handleSelectGame}
              options={[
                { value: '', label: '— no game (arena-only) —' },
                ...games.map((g) => ({
                  value: g.id,
                  label: `${g.name} (${g.id})`,
                })),
              ]}
            />
          </Field>

          {game && <GameInfoCard game={game} />}

          {/* ---- Agents ---- */}
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

          {/* ---- Auto-start ---- */}
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

          <p className="text-[10px] text-muted-foreground/70 font-mono leading-relaxed pt-1">
            Battles run without a turn cap — until the arena's win condition fires or an admin
            pauses/aborts. A deterministic seed is generated automatically for reproducible replays.
          </p>
        </>
      )}
    </Modal>
  );
}

/** Arena info card — name, description, declared game, default strategies, capabilities, plugins. */
function ArenaInfoCard({ detail }: { detail: ArenaDetail }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon name="Swords" size={11} className="text-primary" />
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          Arena manifest
        </span>
      </div>
      {detail.description && <p className="text-xs text-foreground/80">{detail.description}</p>}
      <div className="flex flex-wrap gap-1.5">
        <InfoPill label="players" value={`${detail.minPlayers}-${detail.maxPlayers}`} />
        {detail.gameId && <InfoPill label="game" value={detail.gameId} accent="#fb7185" />}
        {(detail.defaultStrategies ?? []).map((s) => (
          <InfoPill key={s} label="strategy" value={s} accent="#a78bfa" />
        ))}
        {(detail.mandatoryCapabilities ?? []).map((c) => (
          <InfoPill key={c} label="cap" value={c} accent="#fbbf24" />
        ))}
      </div>
      {(detail.plugins ?? []).length > 0 && (
        <div className="font-mono text-[10px] text-muted-foreground">
          plugins: {(detail.plugins ?? []).join(', ')}
        </div>
      )}
    </div>
  );
}

/** Game info card — pulled from the selected game's manifest. */
function GameInfoCard({ game }: { game: GameSummary }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon name="Gamepad2" size={11} className="text-primary" />
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          Game manifest
        </span>
        {game.version && (
          <span className="font-mono text-[9px] text-muted-foreground ml-auto">
            v{game.version}
          </span>
        )}
      </div>
      {game.description && <p className="text-xs text-foreground/80">{game.description}</p>}
      <div className="flex flex-wrap gap-1.5">
        {game.category && <InfoPill label="category" value={game.category} accent="#38bdf8" />}
        {game.format && (
          <InfoPill
            label="format"
            value={game.format}
            accent="#fb7185"
          />
        )}
        {(game.min_players || game.max_players) && (
          <InfoPill
            label="players"
            value={`${game.min_players ?? '?'}-${game.max_players ?? '?'}`}
          />
        )}
        {game.grid_size && <InfoPill label="grid" value={`${game.grid_size}×${game.grid_size}`} />}
        {(game.mandatoryCapabilities ?? []).map((c) => (
          <InfoPill key={c} label="cap" value={c} accent="#fbbf24" />
        ))}
        {(game.capabilities ?? []).slice(0, 6).map((c) => (
          <InfoPill key={c} label="tool" value={c} accent="#34d399" />
        ))}
      </div>
      {(game.ui ?? []).length > 0 && (
        <div className="font-mono text-[10px] text-muted-foreground">
          ui panels: {(game.ui ?? []).map((u) => u.id).join(', ')}
        </div>
      )}
    </div>
  );
}

function InfoPill({
  label,
  value,
  accent = '#94a3b8',
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider"
      style={{ color: accent, background: `${accent}14` }}
    >
      <span className="opacity-60">{label}</span> {value}
    </span>
  );
}

export default CreateBattleModal;
