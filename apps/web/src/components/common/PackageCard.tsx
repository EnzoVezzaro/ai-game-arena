import { cn } from '../../lib/utils';
import { packageTypeMeta, installStatusMeta } from '../../lib/arena';
import { Icon } from '../../lib/Icon';

export interface Pkg {
  id: string;
  name?: string;
  version?: string;
  icon?: string;
  author?: string;
  description?: string;
  type?: string;
  bundle_url?: string;
  install_status?: string;
  manifest?: { games?: string[]; plugins?: string[]; arenas?: string[] };
}

interface PackageCardProps {
  pkg: Pkg;
  onInstall?: (p: Pkg) => void;
  onDelete?: (p: Pkg) => void;
}

export function PackageCard({ pkg, onInstall, onDelete }: PackageCardProps) {
  const t = packageTypeMeta(pkg.type || 'bundle');
  const st = installStatusMeta(pkg.install_status || 'installed');
  const installed = pkg.install_status !== 'disabled';
  const manifest = pkg.manifest || {};
  const contents = [
    ...(manifest.games || []),
    ...(manifest.plugins || []),
    ...(manifest.arenas || []),
  ];

  return (
    <div
      className={cn(
        'group relative rounded-2xl glass p-4 transition-all hover:border-primary/40',
        installed ? '' : 'opacity-80',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${t.color}1a`, border: `1px solid ${t.color}40`, color: t.color }}
        >
          <Icon name={t.icon} size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{pkg.name || pkg.id}</h4>
            {pkg.version && (
              <span className="font-mono text-[9px] text-muted-foreground">v{pkg.version}</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {pkg.description || 'No description'}
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase shrink-0"
          style={{ color: st.color, background: `${st.color}18` }}
          title={st.label}
        >
          <Icon name={st.icon} size={9} />
        </span>
      </div>

      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        <span
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider"
          style={{ color: t.color, background: `${t.color}14` }}
        >
          <Icon name={t.icon} size={10} /> {t.label}
        </span>
        {contents.slice(0, 4).map((c, i) => (
          <span
            key={i}
            className="rounded-md bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
          >
            {c}
          </span>
        ))}
        {contents.length > 4 && (
          <span className="font-mono text-[9px] text-muted-foreground">+{contents.length - 4}</span>
        )}
        {pkg.bundle_url && (
          <span className="inline-flex items-center gap-0.5 rounded-md bg-success/10 text-success px-1.5 py-0.5 font-mono text-[9px]">
            <Icon name="Box" size={9} /> bundle
          </span>
        )}
      </div>

      {(onInstall || onDelete || pkg.author) && (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5">
          {onInstall && (
            <button
              onClick={() => onInstall(pkg)}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors',
                installed
                  ? 'bg-muted/40 text-muted-foreground hover:text-foreground'
                  : 'bg-primary/15 text-primary hover:bg-primary/25',
              )}
            >
              <Icon name={installed ? 'PowerOff' : 'Power'} size={11} />{' '}
              {installed ? 'Uninstall' : 'Install'}
            </button>
          )}
          {pkg.author && (
            <span className="text-[10px] text-muted-foreground font-mono">by {pkg.author}</span>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(pkg)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
            >
              <Icon name="Trash2" size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default PackageCard;
