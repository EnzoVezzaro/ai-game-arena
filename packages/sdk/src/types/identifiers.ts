export type BattleId = string & { readonly __brand: 'BattleId' };
export type AgentId = string & { readonly __brand: 'AgentId' };
export type GameId = string & { readonly __brand: 'GameId' };
export type ArenaId = string & { readonly __brand: 'ArenaId' };
export type PluginId = string & { readonly __brand: 'PluginId' };
export type ProfileId = string & { readonly __brand: 'ProfileId' };
export type MatchId = string & { readonly __brand: 'MatchId' };

export function createBattleId(id: string): BattleId {
  return id as BattleId;
}

export function createAgentId(id: string): AgentId {
  return id as AgentId;
}

export function createGameId(id: string): GameId {
  return id as GameId;
}

export function createArenaId(id: string): ArenaId {
  return id as ArenaId;
}

export function createPluginId(id: string): PluginId {
  return id as PluginId;
}

export function createProfileId(id: string): ProfileId {
  return id as ProfileId;
}

export function createMatchId(id: string): MatchId {
  return id as MatchId;
}
