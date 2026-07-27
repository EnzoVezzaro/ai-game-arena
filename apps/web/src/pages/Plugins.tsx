import { useApi } from '../hooks/useApi';

interface Plugin {
  id: string;
  name: string;
  version: string;
  category: string;
  description?: string;
  author?: string;
}

export function Plugins() {
  const { data: plugins, loading } = useApi<Plugin[]>('/api/plugins');

  if (loading) return <div className="text-gray-400">Loading plugins...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-5">Plugins</h2>
      {!plugins || plugins.length === 0 ? (
        <p className="text-gray-400">No plugins loaded. Add plugins to the plugins directory.</p>
      ) : (
        <div className="grid grid-cols-fill-300 gap-5">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className="p-5 bg-[#1a1a2e] rounded-lg border border-[#2a2a4a]"
            >
              <div className="flex justify-between items-start">
                <h3 className="m-0 font-semibold">{plugin.name}</h3>
                <span className="px-2 py-0.5 rounded bg-[#2a2a4a] text-xs text-gray-400">
                  {plugin.category}
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                {plugin.description || 'No description'}
              </p>
              <div className="text-xs text-gray-500 mt-2">
                v{plugin.version} {plugin.author && `by ${plugin.author}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
