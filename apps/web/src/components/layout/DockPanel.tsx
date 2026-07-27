import { useState } from 'react';
import type { ReactNode } from 'react';

export interface DockPanelProps {
  title: string;
  children: ReactNode;
  defaultCollapsed?: boolean;
}

export function DockPanel({ title, children, defaultCollapsed = false }: DockPanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="flex flex-col border-r border-[#2a2a4a] bg-[#16162a]">
      <div className="flex items-center justify-between h-8 px-2 bg-[#1a1a2e] border-b border-[#2a2a4a]">
        <span className="text-xs font-medium text-gray-400 uppercase">{title}</span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-500 hover:text-white text-xs"
        >
          {collapsed ? '>' : '<'}
        </button>
      </div>
      {!collapsed && <div className="flex-1 overflow-auto">{children}</div>}
    </div>
  );
}
