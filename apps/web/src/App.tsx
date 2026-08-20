import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createComponentRegistry } from './runtime/registry/component-registry';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Home';
import { Arenas } from './pages/Arenas';
import { ArenaDetail } from './pages/ArenaDetail';
import { Games } from './pages/Games';
import { CreateGame } from './pages/CreateGame';
import { Battles } from './pages/Battles';
import { Battle } from './pages/Battle';
import { Leaderboard } from './pages/Leaderboard';
import { Agents } from './pages/Agents';
import { AgentDetail } from './pages/AgentDetail';
import { Plugins } from './pages/Plugins';
import { Packages } from './pages/Packages';
import { Marketplace } from './pages/Marketplace';
import { Profiles } from './pages/Profiles';
import { Settings } from './pages/Settings';
import { CommandPalette } from './runtime/commands/CommandPalette';
import { BattleEventLog } from './components/shell/BattleEventLog';
import { loadPluginContributions } from './bootstrap/plugin-loader';
import { Icon } from './lib/Icon';
import './styles/global.css';

const registry = createComponentRegistry();

registry.register({
  id: 'arena:status-connection',
  region: 'status-bar',
  component: function ConnectionStatus() {
    return (
      <span className="mr-4 flex items-center gap-1.5">
        <Icon name="Wifi" size={11} className="text-success" />
        <span className="font-mono text-[10px] text-muted-foreground">Ready</span>
      </span>
    );
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
      <Routes>
        <Route element={<Layout registry={registry} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/arenas" element={<Arenas />} />
          <Route path="/arenas/:id" element={<ArenaDetail />} />
          <Route path="/games" element={<Games />} />
          <Route path="/create-game" element={<CreateGame />} />
          <Route path="/battles" element={<Battles />} />
          <Route path="/battle" element={<Battle />} />
          <Route path="/battle/:id" element={<Battle />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/:id" element={<AgentDetail />} />
          <Route path="/plugins" element={<Plugins />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
      <CommandPalette registry={registry} />
    </BrowserRouter>
  );
}

loadPluginContributions(registry);
