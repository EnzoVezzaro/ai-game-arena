import { useState, useEffect, useCallback } from 'react';
import type { ComponentRegistry } from '../../runtime/registry/component-registry';

interface Command {
  id: string;
  label: string;
  category: string;
  action: () => void;
}

interface CommandPaletteProps {
  registry: ComponentRegistry;
}

export function CommandPalette(_props: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [commands] = useState<Command[]>([]);

  const filtered = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase()),
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg bg-[#1a1a2e] border border-[#2a2a4a] rounded-lg shadow-2xl overflow-hidden">
        <input
          type="text"
          placeholder="Type a command..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-3 bg-transparent text-white outline-none border-b border-[#2a2a4a]"
          autoFocus
        />
        <div className="max-h-64 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-gray-500 text-sm">No commands found</div>
          ) : (
            filtered.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  setOpen(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-[#2a2a4a] text-sm flex items-center justify-between"
              >
                <span>{cmd.label}</span>
                <span className="text-gray-500 text-xs">{cmd.category}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
