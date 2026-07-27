import type { ComponentType } from 'react';

export type ShellRegion =
  | 'header'
  | 'left-dock'
  | 'right-dock'
  | 'bottom-dock'
  | 'workspace'
  | 'status-bar'
  | 'command-palette';

export interface Contribution {
  id: string;
  region: ShellRegion;
  component: ComponentType;
  order?: number;
}

export interface ComponentRegistry {
  register(contribution: Contribution): void;
  unregister(id: string): void;
  getByRegion(region: ShellRegion): Contribution[];
  getAll(): Contribution[];
}

export function createComponentRegistry(): ComponentRegistry {
  const contributions = new Map<string, Contribution>();

  return {
    register(contribution: Contribution): void {
      contributions.set(contribution.id, contribution);
    },

    unregister(id: string): void {
      contributions.delete(id);
    },

    getByRegion(region: ShellRegion): Contribution[] {
      return Array.from(contributions.values())
        .filter((c) => c.region === region)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },

    getAll(): Contribution[] {
      return Array.from(contributions.values());
    },
  };
}
