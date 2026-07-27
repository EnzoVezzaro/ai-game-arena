import type { ReactNode } from 'react';
import type { ComponentRegistry } from '../../runtime/registry/component-registry';
import { Header } from '../../components/shell/Header';
import { StatusBar } from '../../components/shell/StatusBar';
import { DockPanel } from '../../components/layout/DockPanel';

interface ShellProps {
  registry: ComponentRegistry;
  children: ReactNode;
}

export function Shell({ registry, children }: ShellProps) {
  const headerContribs = registry.getByRegion('header');
  const leftDockContribs = registry.getByRegion('left-dock');
  const rightDockContribs = registry.getByRegion('right-dock');
  const bottomDockContribs = registry.getByRegion('bottom-dock');
  const statusBarContribs = registry.getByRegion('status-bar');

  return (
    <div className="flex flex-col h-screen bg-[#0d0d1a] text-white">
      <Header contributions={headerContribs} />
      <div className="flex flex-1 overflow-hidden">
        {leftDockContribs.length > 0 && (
          <DockPanel title="Explorer">
            {leftDockContribs.map((c) => {
              const Component = c.component;
              return <Component key={c.id} />;
            })}
          </DockPanel>
        )}
        <main className="flex-1 overflow-auto p-4">{children}</main>
        {rightDockContribs.length > 0 && (
          <DockPanel title="Properties">
            {rightDockContribs.map((c) => {
              const Component = c.component;
              return <Component key={c.id} />;
            })}
          </DockPanel>
        )}
      </div>
      {bottomDockContribs.length > 0 && (
        <div className="h-48 border-t border-[#2a2a4a] bg-[#16162a] overflow-auto">
          {bottomDockContribs.map((c) => {
            const Component = c.component;
            return <Component key={c.id} />;
          })}
        </div>
      )}
      <StatusBar contributions={statusBarContribs} />
    </div>
  );
}
