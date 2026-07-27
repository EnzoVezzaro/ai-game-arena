import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface Panel {
  id: string;
  title: string;
  component: ReactNode;
  collapsed?: boolean;
  size?: number;
}

export interface DockManagerState {
  panels: Panel[];
  activePanelId: string | null;
}

export function useDockManager(initialPanels: Panel[] = []) {
  const [state, setState] = useState<DockManagerState>({
    panels: initialPanels,
    activePanelId: initialPanels[0]?.id ?? null,
  });

  const addPanel = useCallback((panel: Panel) => {
    setState((prev) => ({
      ...prev,
      panels: [...prev.panels, panel],
      activePanelId: prev.activePanelId ?? panel.id,
    }));
  }, []);

  const removePanel = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      panels: prev.panels.filter((p) => p.id !== id),
      activePanelId: prev.activePanelId === id ? (prev.panels[0]?.id ?? null) : prev.activePanelId,
    }));
  }, []);

  const setActivePanel = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activePanelId: id }));
  }, []);

  const toggleCollapsed = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      panels: prev.panels.map((p) => (p.id === id ? { ...p, collapsed: !p.collapsed } : p)),
    }));
  }, []);

  return { state, addPanel, removePanel, setActivePanel, toggleCollapsed };
}
