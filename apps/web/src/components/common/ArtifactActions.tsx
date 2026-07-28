import { Icon } from '../../lib/Icon';
import type { Artifact, ArtifactStatus } from '../../lib/artifacts';
import { nextLifecycleAction } from '../../lib/artifacts';
import { cn } from '../../lib/utils';

interface ArtifactActionsProps {
  artifact: Artifact;
  actions: ReturnType<typeof import('../../lib/artifacts').useArtifactActions>;
  compact?: boolean;
}

const STATUS_META: Record<ArtifactStatus, { label: string; color: string; icon: string }> = {
  uploaded: { label: 'Staged', color: '#fbbf24', icon: 'Clock' },
  installed: { label: 'Installed', color: '#38bdf8', icon: 'Check' },
  enabled: { label: 'Enabled', color: '#34d399', icon: 'Power' },
  disabled: { label: 'Disabled', color: '#94a3b8', icon: 'PowerOff' },
};

export function ArtifactStatusBadge({ status }: { status: ArtifactStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.uploaded;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase shrink-0"
      style={{ color: m.color, background: `${m.color}18` }}
      title={m.label}
    >
      <Icon name={m.icon} size={9} /> {m.label}
    </span>
  );
}

export function ArtifactActions({ artifact, actions, compact }: ArtifactActionsProps) {
  const next = nextLifecycleAction(artifact.status, artifact.published);
  const isBusy = (a: string) => actions.busy === `${a}:${artifact.id}`;

  const btn = (
    label: string,
    icon: string,
    onClick: () => void,
    opts: { variant?: 'primary' | 'ghost' | 'danger'; busy?: boolean } = {},
  ) => {
    const variant = opts.variant ?? 'ghost';
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        disabled={opts.busy}
        className={cn(
          'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-50',
          variant === 'primary' && 'bg-primary/15 text-primary hover:bg-primary/25',
          variant === 'ghost' && 'bg-muted/40 text-muted-foreground hover:text-foreground',
          variant === 'danger' && 'bg-muted/40 text-muted-foreground hover:text-destructive',
        )}
      >
        <Icon
          name={opts.busy ? 'Loader' : icon}
          size={11}
          className={opts.busy ? 'animate-spin' : ''}
        />
        {!compact && label}
      </button>
    );
  };

  const canUninstall =
    artifact.status === 'installed' ||
    artifact.status === 'enabled' ||
    artifact.status === 'disabled';

  return (
    <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5 flex-wrap">
      {artifact.status !== 'uploaded' && (
        <span className="font-mono text-[9px] text-muted-foreground mr-1 hidden sm:inline">
          v{artifact.version}
        </span>
      )}

      {btn(next.label, next.icon, () => actions[next.action](artifact.id), {
        variant: 'primary',
        busy: isBusy(next.action),
      })}

      {canUninstall &&
        btn('Uninstall', 'Trash', () => actions.uninstall(artifact.id), {
          busy: isBusy('uninstall'),
        })}

      {/* Enable/disable toggle (explicit) */}
      {artifact.status === 'enabled' &&
        btn('Disable', 'PowerOff', () => actions.disable(artifact.id), { busy: isBusy('disable') })}
      {artifact.status === 'disabled' &&
        btn('Enable', 'Power', () => actions.enable(artifact.id), { busy: isBusy('enable') })}

      {/* Publish / unpublish */}
      {!artifact.published
        ? btn('Publish', 'Globe', () => actions.publish(artifact.id), {
            variant: 'primary',
            busy: isBusy('publish'),
          })
        : btn('Unpublish', 'Globe', () => actions.unpublish(artifact.id), {
            busy: isBusy('unpublish'),
          })}

      <div className="ml-auto" />

      {/* Remove */}
      {btn('Remove', 'Trash2', () => actions.remove(artifact.id), {
        variant: 'danger',
        busy: isBusy(''),
      })}
    </div>
  );
}

export default ArtifactActions;
