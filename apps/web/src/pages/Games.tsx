import { useEffect, useMemo, useState } from 'react';
import { GAME_FORMATS } from '../lib/arena';
import { Icon } from '../lib/Icon';
import { Chip } from '../components/common/Chip';
import { GameCard } from '../components/common/GameCard';
import { ArtifactSection } from '../components/common/ArtifactSection';
import type { Game } from '../components/common/GameBadge';

interface ApiGame {
  id: string;
  name: string;
  version: string;
  description?: string;
  category?: string;
  format?: string;
  adapterType?: string;
  icon?: string;
  min_players?: number;
  max_players?: number;
  grid_size?: number;
  capabilities: string[];
  mandatoryCapabilities: string[];
  path: string;
}

const toGame = (g: ApiGame): Game => ({
  id: g.id,
  slug: g.path,
  name: g.name,
  version: g.version,
  description: g.description,
  format: g.format ?? g.adapterType ?? 'native',
  adapter: g.adapterType ?? g.format ?? 'native',
  icon: g.icon,
  grid_size: g.grid_size,
  min_players: g.min_players,
  max_players: g.max_players,
  mandatory_capabilities: g.mandatoryCapabilities,
  controller_schema: g.capabilities.map((c, i) => ({
    name: c,
    type: 'action',
    mandatory: i === 0,
  })),
  install_status: 'installed',
});

export function Games() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [fmt, setFmt] = useState<string>('all');

  useEffect(() => {
    fetch('/api/games')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: ApiGame[]) => setGames((list ?? []).map(toGame)))
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: games.length };
    for (const k of Object.keys(GAME_FORMATS))
      c[k] = games.filter((g) => (g.format || 'html') === k).length;
    return c;
  }, [games]);

  const filtered = useMemo(
    () => (fmt === 'all' ? games : games.filter((g) => (g.format || 'html') === fmt)),
    [games, fmt],
  );

  return (
    <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
          / games · registry
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Game Registry</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Games are wrappers around any format — HTML5, Unity WebGL, canvas, DOM, embeds — exposing
          MCP <span className="text-foreground/80">controllers</span> that agents use to play like
          humans. Upload a zip below to stage a new game.
        </p>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-6">
        <Chip label="All" count={counts.all} active={fmt === 'all'} onClick={() => setFmt('all')} />
        {Object.entries(GAME_FORMATS).map(([key, m]) => (
          <Chip
            key={key}
            label={m.label}
            icon={m.icon}
            color={m.color}
            count={counts[key]}
            active={fmt === key}
            onClick={() => setFmt(key)}
          />
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>
      {filtered.length === 0 && !loading && (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="Gamepad2" size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No games in this format yet. Upload a zip below to stage one.</p>
        </div>
      )}
      {loading && (
        <div className="text-center py-20 text-muted-foreground text-sm">Loading games…</div>
      )}

      <ArtifactSection
        type="game"
        title="Uploaded Games"
        description="Stage a new game adapter from a .zip — install, enable, remove, or publish to the marketplace."
      />
    </div>
  );
}

export default Games;
