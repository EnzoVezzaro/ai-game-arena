import type { AgentId } from './identifiers';

export type DeviceType = 'keyboard' | 'mouse' | 'pointer' | 'touch' | 'gamepad' | 'wheel' | 'pen';

export interface Controller {
  initialize(): Promise<void>;
  registerDevice(device: InputDevice): void;
  connect(session: MCPSession): Promise<void>;
  getCapabilities(): Capability[];
  execute(action: ControllerAction): Promise<ActionResult>;
  shutdown(): Promise<void>;
}

export interface InputDevice {
  readonly type: DeviceType;
  readonly name: string;
  getCapabilities(): Capability[];
  execute(action: DeviceAction): Promise<DeviceActionResult>;
}

export interface ControllerAction {
  readonly agentId: AgentId;
  readonly device: DeviceType;
  readonly action: string;
  readonly parameters: Record<string, unknown>;
}

export interface ActionResult {
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: string;
}

export interface DeviceAction {
  readonly action: string;
  readonly parameters: Record<string, unknown>;
}

export interface DeviceActionResult {
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: string;
}

export interface Capability {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, ParameterDefinition>;
  readonly mandatory: boolean;
}

export interface ParameterDefinition {
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly description: string;
  readonly required: boolean;
  readonly default?: unknown;
}

export interface MCPSession {
  readonly id: string;
  readonly agentId: AgentId;
}
