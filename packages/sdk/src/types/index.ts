// Core types - identifiers
export type {
  BattleId,
  AgentId,
  GameId,
  ArenaId,
  PluginId,
  ProfileId,
  MatchId,
} from './identifiers';
export {
  createBattleId,
  createAgentId,
  createGameId,
  createArenaId,
  createPluginId,
  createProfileId,
  createMatchId,
} from './identifiers';

// Core domain types
export type {
  BattleConfig,
  BattleState,
  BattlePhase,
  AgentConfig,
  AgentProfile,
  AgentStrategy,
  ProviderConfig,
  MatchConfig,
} from './battle';
export type {
  ObservationType,
  Observation,
  ObservationData,
  ObservationMetadata,
} from './observation';
export type {
  ArenaConfig,
  ArenaPlugin,
  ArenaContainer,
  UiElement,
  UiElementType,
  UiPosition,
  DisplayConfig,
  WorldState,
  RenderState,
  ToolDefinition,
  ToolParameter,
  ValidationResult,
  ActionOutcome,
  GameEvent,
  WinCondition,
  ScoreMap,
} from './arena';
export type {
  AgentRuntime,
  AgentAction,
  AgentMessage,
  AgentMemory,
  MemoryEntry,
  AgentSession,
  Controller,
  InputAction,
  Capability,
  ParameterDefinition,
} from './agent';
export type {
  GameConfig,
  GameAdapter,
  ControllerAdapter,
  ObservationAdapter,
  GameState,
  NativeInputType,
  NativeInput,
  BridgeConfig,
  BridgeAction,
  BridgeObservation,
  BridgeGameState,
  BridgeCapabilities,
  BridgeEvent,
  BridgeEventType,
  GameBridge,
} from './game';

// Plugin system
export type {
  PluginCategory,
  PluginManifest,
  ActivationConfig,
  Contributions,
  PluginContext,
  McpTool,
  EventHook,
  ServerRoute,
  CliCommand,
  UiPanelContribution,
  DashboardWidget,
  NavigationItem,
  ContextMenuItem,
  PluginStorage,
  Subscription,
  ServerMiddleware,
} from './plugin';

// Events
export type {
  DomainEvent,
  EventMetadata,
  EventHandler,
  EventBus,
  BattleCreated,
  BattleStarted,
  BattleFinished,
  BattleAborted,
  BattlePaused,
  AgentJoinedBattle,
  AgentLeftBattle,
  TurnStarted,
  TurnFinished,
  ObservationCaptured,
  ToolRequested,
  ToolExecuted,
  ActionExecuted,
  ActionRejected,
  MessageSent,
  MessageReceived,
  StateChanged,
  ScoreUpdated,
  WinConditionMet,
  PluginActivated,
  PluginDeactivated,
  ThinkingStarted,
  ThinkingFinished,
  ToolCalled,
  AgentError,
} from './events';

// Infrastructure
export type { StorageAdapter, QueryFilter, QueryOperator } from './storage';
export type { Logger, LogLevel, LogContext } from './logging';
export type { ConfigReader } from './config';

// Architecture types
export type { Mind, CognitiveModule, CognitiveState, Intent } from './mind';
export type { Identity, IdentityState, MemoryProvider } from './identity';
export type { Sensor, SensorCapability, ObservationFragment } from './sensor';
export type { Driver, InputTransport } from './driver';
export type { Platform, PlatformCapabilities } from './platform';
export type { Session, SessionConfig, SessionState } from './session';
export type { Recording, ReplayEntry, Replayer } from './replay';
export type { Player } from './player';
