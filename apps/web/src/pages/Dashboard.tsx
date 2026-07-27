import { useApi } from '../hooks/useApi';

interface Plugin {
  id: string;
  name: string;
}

interface Battle {
  id: string;
  state: { phase: string };
}

export function Dashboard() {
  const { data: plugins, loading: pluginsLoading } = useApi<Plugin[]>('/api/plugins');
  const { data: battles, loading: battlesLoading } = useApi<Battle[]>('/api/battles');

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Dashboard</h2>
      <div className="grid grid-cols-3 gap-5">
        <StatCard
          title="Plugins Loaded"
          value={pluginsLoading ? '...' : (plugins?.length ?? 0)}
          icon="🧩"
        />
        <StatCard
          title="Active Battles"
          value={
            battlesLoading
              ? '...'
              : (battles?.filter((b) => b.state.phase === 'running').length ?? 0)
          }
          icon="⚔️"
        />
        <StatCard
          title="Total Battles"
          value={battlesLoading ? '...' : (battles?.length ?? 0)}
          icon="📊"
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number | string; icon: string }) {
  return (
    <div className="p-5 bg-[#1a1a2e] rounded-lg border border-[#2a2a4a]">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-400">{title}</div>
    </div>
  );
}
