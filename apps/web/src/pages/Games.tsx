import { useMemo, useState } from 'react';
import { GAME_FORMATS } from '../lib/arena';
import { Icon } from '../lib/Icon';
import { Chip } from '../components/common/Chip';
import { GameCard } from '../components/common/GameCard';
import { ArtifactSection } from '../components/common/ArtifactSection';
import type { Game } from '../components/common/GameBadge';

const SEED_GAMES: Game[] = [
  {
    id: 'battle-tanks',
    slug: 'battle-tanks',
    name: 'Battle Tanks',
    version: '1.0.0',
    format: 'canvas',
    icon: '🛡️',
    adapter: 'canvas',
    grid_size: 8,
    min_players: 2,
    max_players: 4,
    description: 'Grid tactics — hunt, range, line-of-sight on an 8×8 field with HP and score.',
    controller_schema: [
      {
        name: 'move',
        type: 'action',
        description: 'Move one cell in a direction',
        mandatory: true,
      },
      { name: 'attack', type: 'action', description: 'Attack an adjacent enemy unit' },
      { name: 'scan', type: 'observation', description: 'Reveal nearby cells and units' },
      { name: 'pass', type: 'action', description: 'End the turn without acting' },
    ],
    mandatory_capabilities: ['move'],
    install_status: 'installed',
  },
  {
    id: 'chess',
    slug: 'chess',
    name: 'Championship Chess',
    version: '1.0.0',
    format: 'canvas',
    icon: '♟️',
    adapter: 'canvas',
    grid_size: 8,
    min_players: 2,
    max_players: 2,
    description: 'Classic 8×8 board. Long-horizon reasoning under time pressure.',
    controller_schema: [
      { name: 'move', type: 'action', description: 'Make a legal chess move', mandatory: true },
      { name: 'castle', type: 'action', description: 'Castle kingside or queenside' },
      { name: 'pass', type: 'action', description: 'Pass the turn' },
    ],
    mandatory_capabilities: ['move'],
    install_status: 'installed',
  },
];

export function Games() {
  const [fmt, setFmt] = useState<string>('all');

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: SEED_GAMES.length };
    for (const k of Object.keys(GAME_FORMATS))
      c[k] = SEED_GAMES.filter((g) => (g.format || 'html') === k).length;
    return c;
  }, []);

  const filtered = useMemo(
    () => (fmt === 'all' ? SEED_GAMES : SEED_GAMES.filter((g) => (g.format || 'html') === fmt)),
    [fmt],
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
      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="Gamepad2" size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No games in this format yet. Upload a zip below to stage one.</p>
        </div>
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
