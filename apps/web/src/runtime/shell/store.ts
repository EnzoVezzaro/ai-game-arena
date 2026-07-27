import { create } from 'zustand';

interface ShellState {
  activeView: string;
  bottomDockVisible: boolean;
  leftDockVisible: boolean;
  rightDockVisible: boolean;
  setActiveView: (view: string) => void;
  toggleBottomDock: () => void;
  toggleLeftDock: () => void;
  toggleRightDock: () => void;
}

export const useShellStore = create<ShellState>((set) => ({
  activeView: 'dashboard',
  bottomDockVisible: false,
  leftDockVisible: false,
  rightDockVisible: false,
  setActiveView: (view) => set({ activeView: view }),
  toggleBottomDock: () => set((s) => ({ bottomDockVisible: !s.bottomDockVisible })),
  toggleLeftDock: () => set((s) => ({ leftDockVisible: !s.leftDockVisible })),
  toggleRightDock: () => set((s) => ({ rightDockVisible: !s.rightDockVisible })),
}));
