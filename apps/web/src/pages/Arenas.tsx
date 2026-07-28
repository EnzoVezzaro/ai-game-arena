import { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { ARENA_CATEGORIES, categoryMeta } from '../lib/arena';
import { Icon } from '../lib/Icon';
import { PageLoader } from '../components/common/PageLoader';
import { ArenaCard, type Arena } from '../components/common/ArenaCard';
import { Chip } from '../components/common/Chip';
import { ArtifactSection } from '../components/common/ArtifactSection';

interface ArenaApi {
  id: string;
  name?: string;
  description?: string;
  minPlayers?: number;
  maxPlayers?: number;
  config?: Record<string, unknown>;
}

const mapArena = (a: ArenaApi, fallbackCategory = 'classic'): Arena => {
  const cfg = (a.config || {}) as {
    category?: string;
    accent_color?: string;
    icon?: string;
    tagline?: string;
    game_slugs?: string[];
    slug?: string;
  };
  const category = cfg.category || fallbackCategory;
  const cat = categoryMeta(category);
  return {
    id: a.id,
    slug: cfg.slug || a.id,
    name: a.name || a.id,
    tagline: cfg.tagline || a.description || 'An AI battle environment.',
    category,
    accent_color: cfg.accent_color || cat.color,
    icon: cfg.icon || '🎮',
    game_slugs: cfg.game_slugs || [],
  };
};

export function Arenas() {
  const { data: arenas, loading } = useApi<ArenaApi[]>('/api/arenas');
  const [cat, setCat] = useState<string>('all');
  const [q, setQ] = useState('');

  const mapped = useMemo(() => (arenas || []).map((a) => mapArena(a)), [arenas]);

  const filtered = useMemo(
    () =>
      mapped.filter(
        (a) =>
          (cat === 'all' || a.category === cat) &&
          (!q ||
            a.name?.toLowerCase().includes(q.toLowerCase()) ||
            a.tagline?.toLowerCase().includes(q.toLowerCase())),
      ),
    [mapped, cat, q],
  );

  if (loading) return <PageLoader label="Loading arenas" />;

  return (
    <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
          / arenas · composable
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Battle Environments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Arenas compose games + plugins into a hostable environment. The game is one installable
          component inside the arena. Upload a zip below to stage a new arena.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card/50 px-3 py-2 flex-1">
          <Icon name="Search" size={15} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search arenas…"
            className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted-foreground text-foreground"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <Chip label="All" active={cat === 'all'} onClick={() => setCat('all')} />
          {Object.entries(ARENA_CATEGORIES).map(([key, m]) => (
            <Chip
              key={key}
              label={m.label}
              icon={m.icon}
              color={m.color}
              active={cat === key}
              onClick={() => setCat(key)}
            />
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((a) => (
          <ArenaCard key={a.id} arena={a} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="Search" size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No arenas match your filters.</p>
        </div>
      )}

      <ArtifactSection
        type="arena"
        title="Uploaded Arenas"
        description="Stage a new arena from a .zip — install, enable, remove, or publish to the marketplace."
      />
    </div>
  );
}

export default Arenas;
