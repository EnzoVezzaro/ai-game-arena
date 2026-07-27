import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createComponentRegistry } from './runtime/registry/component-registry';
import { Shell } from './runtime/shell/Shell';
import { Dashboard } from './pages/Dashboard';
import { Battles } from './pages/Battles';
import { Plugins } from './pages/Plugins';
import { Settings } from './pages/Settings';
import { CommandPalette } from './runtime/commands/CommandPalette';
import { BattleEventLog } from './components/shell/BattleEventLog';
import { loadPluginContributions } from './bootstrap/plugin-loader';
import './styles/global.css';

const registry = createComponentRegistry();

registry.register({
  id: 'arena:status-connection',
  region: 'status-bar',
  component: function ConnectionStatus() {
    return <span className="mr-4 flex items-center gap-1.5">Ready</span>;
  },
  order: 0,
});

registry.register({
  id: 'arena:bottom-dock:events',
  region: 'bottom-dock',
  component: BattleEventLog,
  order: 0,
});

export function App() {
  return (
    <BrowserRouter>
      <Shell registry={registry}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/battles" element={<Battles />} />
          <Route path="/plugins" element={<Plugins />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Shell>
      <CommandPalette registry={registry} />
    </BrowserRouter>
  );
}

loadPluginContributions(registry);