import { useLocation, useNavigate } from 'react-router-dom';
import type { Contribution } from '../../runtime/registry/component-registry';

interface HeaderProps {
  contributions: Contribution[];
}

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard' },
  { path: '/battles', label: 'Battles' },
  { path: '/plugins', label: 'Plugins' },
  { path: '/settings', label: 'Settings' },
];

export function Header({ contributions }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="flex items-center h-12 px-4 bg-[#1a1a2e] text-white border-b border-[#2a2a4a]">
      <div className="flex items-center gap-2 mr-6">
        <span className="text-lg font-bold">Arena</span>
      </div>
      <nav className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              location.pathname === item.path
                ? 'bg-[#2a2a4a] text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#2a2a4a]/50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        {contributions.map((c) => {
          const Component = c.component;
          return <Component key={c.id} />;
        })}
      </div>
    </header>
  );
}
