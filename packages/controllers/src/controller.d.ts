import { McpServer } from '@ai-game-arena/mcp';
import type { Capability, Controller as ControllerInterface } from '@ai-game-arena/sdk';
export interface InputAction {
    device: string;
    action: string;
    parameters: Record<string, unknown>;
    timestamp: number;
}
export interface ControllerOptions {
    id?: string;
    name?: string;
}
export declare class Controller implements ControllerInterface {
    readonly id: string;
    readonly name: string;
    private mcpServer;
    private inputHistory;
    private actionCallback;
    constructor(options?: ControllerOptions);
    private registerDefaultDevices;
    registerTool(name: string, description: string, inputSchema: Record<string, unknown>, handler: (args: Record<string, unknown>) => Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
        isError?: boolean;
    }>): void;
    onAction(callback: (action: InputAction) => void): void;
    private recordAction;
    getInputHistory(): InputAction[];
    getMcpServer(): McpServer;
    getCapabilities(): Capability[];
    clearHistory(): void;
}
//# sourceMappingURL=controller.d.ts.map