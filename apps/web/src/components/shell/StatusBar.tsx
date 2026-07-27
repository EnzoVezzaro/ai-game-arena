import type { Contribution } from '../../runtime/registry/component-registry';

interface StatusBarProps {
  contributions: Contribution[];
}

export function StatusBar({ contributions }: StatusBarProps) {
  return (
    <footer className="flex items-center h-6 px-4 bg-[#1a1a2e] text-gray-500 text-xs border-t border-[#2a2a4a]">
      <span>AI Game Arena v0.1.0</span>
      <div className="flex-1" />
      {contributions.map((c) => {
        const Component = c.component;
        return <Component key={c.id} />;
      })}
    </footer>
  );
}
