import { useMemo, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { PLUGIN_CATEGORIES } from '../lib/arena';
import { Icon } from '../lib/Icon';
import { PageLoader } from '../components/common/PageLoader';
import { PluginCard, type PluginDetailed } from '../components/common/PluginCard';
import { Chip } from '../components/common/Chip';
import { ArtifactSection } from '../components/common/ArtifactSection';

export function Plugins() {
  const { data: plugins, loading } = useApi<PluginDetailed[]>('/api/plugins');
  const [cat, setCat] = useState<string>('all');

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: plugins?.length ?? 0 };
    for (const k of Object.keys(PLUGIN_CATEGORIES))
      c[k] = plugins?.filter((p) => (p.category || 'arena') === k).length ?? 0;
    return c;
  }, [plugins]);

  const filtered = useMemo(
    () => (plugins || []).filter((p) => cat === 'all' || (p.category || 'arena') === cat),
    [plugins, cat],
  );

  if (loading) return <PageLoader label="Loading plugins" />;

  return (
    <div className="px-4 lg:px-8 py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
          / plugins · registry
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Plugin Registry</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every feature is a plugin — arenas, interactions, exporters, agents, visualizations, and
          metrics. Upload a zip below to stage a new one, then install, enable, and publish to the
          marketplace.
        </p>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-6">
        <Chip label="All" count={counts.all} active={cat === 'all'} onClick={() => setCat('all')} />
        {Object.entries(PLUGIN_CATEGORIES).map(([key, m]) => (
          <Chip
            key={key}
            label={m.label}
            icon={m.icon}
            color={m.color}
            count={counts[key]}
            active={cat === key}
            onClick={() => setCat(key)}
          />
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <PluginCard key={p.id} plugin={p} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Icon name="Puzzle" size={28} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No plugins in this category.</p>
        </div>
      )}

      <ArtifactSection
        type="plugin"
        title="Uploaded Plugins"
        description="Stage a new plugin from a .zip — then install, enable, remove, or publish to the marketplace."
      />
    </div>
  );
}

export default Plugins;
