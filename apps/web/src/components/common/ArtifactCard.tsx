import { Icon } from '../../lib/Icon';
import { packageTypeMeta } from '../../lib/arena';
import type { Artifact } from '../../lib/artifacts';
import { ArtifactActions, ArtifactStatusBadge } from './ArtifactActions';

interface ArtifactCardProps {
  artifact: Artifact;
  actions: ReturnType<typeof import('../../lib/artifacts').useArtifactActions>;
}

const TYPE_COLOR: Record<string, string> = {
  plugin: '#a78bfa',
  game: '#fb7185',
  arena: '#38bdf8',
};

const TYPE_ICON: Record<string, string> = {
  plugin: 'Puzzle',
  game: 'Gamepad2',
  arena: 'Trophy',
};

export function ArtifactCard({ artifact, actions }: ArtifactCardProps) {
  const color = TYPE_COLOR[artifact.type] ?? '#a78bfa';
  const icon = TYPE_ICON[artifact.type] ?? 'Package';
  const category = (artifact.manifest.category as string | undefined) ?? artifact.type ?? 'bundle';
  const meta = packageTypeMeta(category);

  return (
    <div className="group relative rounded-2xl glass p-4 transition-all hover:border-primary/40">
      <div className="flex items-start gap-3">
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}1a`, border: `1px solid ${color}40`, color }}
        >
          <Icon name={icon} size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm truncate">{artifact.name}</h4>
            <span className="font-mono text-[9px] text-muted-foreground">v{artifact.version}</span>
            <ArtifactStatusBadge status={artifact.status} />
            {artifact.published && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase"
                style={{ color: '#34d399', background: '#34d39918' }}
                title={`Published ${artifact.published_at ? new Date(artifact.published_at).toLocaleString() : ''}`}
              >
                <Icon name="Globe" size={9} /> Public
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {artifact.description ?? meta.label}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        <span
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider"
          style={{ color: meta.color, background: `${meta.color}14` }}
        >
          <Icon name={meta.icon} size={10} /> {meta.label}
        </span>
        <span className="font-mono text-[9px] text-muted-foreground">{artifact.slug}</span>
      </div>

      <ArtifactActions artifact={artifact} actions={actions} compact={false} />

      {actions.error && actions.error.length > 0 && (
        <p className="mt-2 text-[10px] text-destructive font-mono">{actions.error}</p>
      )}
    </div>
  );
}

export default ArtifactCard;

// re-export to satisfy import cycle awkwardness
export type { Artifact };
