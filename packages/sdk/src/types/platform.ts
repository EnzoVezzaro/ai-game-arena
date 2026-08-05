export interface PlatformCapabilities {
  readonly videoCapture: boolean;
  readonly audioCapture: boolean;
  readonly memoryRead: boolean;
  readonly memoryWrite: boolean;
  readonly saveState: boolean;
  readonly debugSymbols: boolean;
  readonly achievements: boolean;
  readonly cloudSaves: boolean;
  readonly symbols: boolean;
}

export interface Platform {
  readonly name: string;
  readonly capabilities: PlatformCapabilities;
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  capture(): Promise<unknown>;
  sendInput(events: unknown[]): Promise<void>;
  getState(): Promise<unknown>;
}
