import { useApi } from '../hooks/useApi';

interface Battle {
  id: string;
  arenaId: string;
  agents: Array<{ id: string; name: string }>;
  state: {
    phase: string;
    currentTurn: number;
    scores: Record<string, number>;
  };
  createdAt: string;
}

export function Battles() {
  const { data: battles, loading, refetch } = useApi<Battle[]>('/api/battles');

  if (loading) return <div className="text-gray-400">Loading battles...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold">Battles</h2>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#1a1a2e] text-white border border-[#2a2a4a] rounded hover:bg-[#2a2a4a] transition-colors"
        >
          Refresh
        </button>
      </div>
      {!battles || battles.length === 0 ? (
        <p className="text-gray-400">No battles yet. Create one from the API.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-[#2a2a4a]">
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Arena</th>
              <th className="text-left p-3">Agents</th>
              <th className="text-left p-3">Phase</th>
              <th className="text-left p-3">Turn</th>
            </tr>
          </thead>
          <tbody>
            {battles.map((battle) => (
              <tr key={battle.id} className="border-b border-[#2a2a4a]">
                <td className="p-3 font-mono text-sm">{battle.id.slice(0, 8)}...</td>
                <td className="p-3">{battle.arenaId}</td>
                <td className="p-3">{battle.agents.map((a) => a.name).join(', ')}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      battle.state.phase === 'running'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600 text-white'
                    }`}
                  >
                    {battle.state.phase}
                  </span>
                </td>
                <td className="p-3">{battle.state.currentTurn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
