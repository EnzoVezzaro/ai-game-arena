import { Icon } from '../lib/Icon';

interface SettingRow {
  icon: string;
  label: string;
  desc: string;
  value?: string;
}

const SETTINGS: SettingRow[] = [
  {
    icon: 'Activity',
    label: 'Runtime Health Check',
    desc: 'Server uptime, database, plugin system',
    value: '/health',
  },
  {
    icon: 'Cpu',
    label: 'WebSocket Endpoint',
    desc: 'Live battle event streaming',
    value: '/ws/battles',
  },
  { icon: 'Code2', label: 'API Version', desc: 'Versioned REST surface', value: '/api/v1' },
  {
    icon: 'Layers',
    label: 'Layout Shell',
    desc: 'VS Code-style dock registry (active)',
    value: 'runtime v1',
  },
  {
    icon: 'Sparkles',
    label: 'Theme',
    desc: 'Dark glass-morphism, terminal aesthetic',
    value: 'dark ✦ cyan',
  },
  {
    icon: 'Save',
    label: 'Persistent State',
    desc: 'Zustand persistence key',
    value: 'aga-app-state',
  },
];

export function Settings() {
  return (
    <div className="px-4 lg:px-8 py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
          / settings
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Runtime configuration and shell preferences.
        </p>
      </div>

      <div className="glass rounded-2xl divide-y divide-border">
        {SETTINGS.map((s) => (
          <div key={s.label} className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Icon name={s.icon} size={15} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.desc}</div>
            </div>
            {s.value && (
              <span className="font-mono text-[10px] text-muted-foreground rounded-md bg-muted/60 px-2 py-1 hidden sm:inline">
                {s.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Settings;
