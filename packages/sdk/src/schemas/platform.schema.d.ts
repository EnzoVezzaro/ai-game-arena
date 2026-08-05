import { z } from 'zod';
export declare const PlatformCapabilitiesSchema: z.ZodObject<{
    videoCapture: z.ZodBoolean;
    audioCapture: z.ZodBoolean;
    memoryRead: z.ZodBoolean;
    memoryWrite: z.ZodBoolean;
    saveState: z.ZodBoolean;
    debugSymbols: z.ZodBoolean;
    achievements: z.ZodBoolean;
    cloudSaves: z.ZodBoolean;
    symbols: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    achievements: boolean;
    videoCapture: boolean;
    audioCapture: boolean;
    memoryRead: boolean;
    memoryWrite: boolean;
    saveState: boolean;
    debugSymbols: boolean;
    cloudSaves: boolean;
    symbols: boolean;
}, {
    achievements: boolean;
    videoCapture: boolean;
    audioCapture: boolean;
    memoryRead: boolean;
    memoryWrite: boolean;
    saveState: boolean;
    debugSymbols: boolean;
    cloudSaves: boolean;
    symbols: boolean;
}>;
export declare const PlatformSchema: z.ZodObject<{
    name: z.ZodString;
    capabilities: z.ZodObject<{
        videoCapture: z.ZodBoolean;
        audioCapture: z.ZodBoolean;
        memoryRead: z.ZodBoolean;
        memoryWrite: z.ZodBoolean;
        saveState: z.ZodBoolean;
        debugSymbols: z.ZodBoolean;
        achievements: z.ZodBoolean;
        cloudSaves: z.ZodBoolean;
        symbols: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        achievements: boolean;
        videoCapture: boolean;
        audioCapture: boolean;
        memoryRead: boolean;
        memoryWrite: boolean;
        saveState: boolean;
        debugSymbols: boolean;
        cloudSaves: boolean;
        symbols: boolean;
    }, {
        achievements: boolean;
        videoCapture: boolean;
        audioCapture: boolean;
        memoryRead: boolean;
        memoryWrite: boolean;
        saveState: boolean;
        debugSymbols: boolean;
        cloudSaves: boolean;
        symbols: boolean;
    }>;
    initialize: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>;
    start: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>;
    stop: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>;
    capture: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodPromise<z.ZodUnknown>>;
    sendInput: z.ZodFunction<z.ZodTuple<[z.ZodArray<z.ZodUnknown, "many">], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>;
    getState: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    start: (...args: unknown[]) => Promise<void>;
    name: string;
    stop: (...args: unknown[]) => Promise<void>;
    initialize: (...args: unknown[]) => Promise<void>;
    getState: (...args: unknown[]) => Promise<any>;
    capabilities: {
        achievements: boolean;
        videoCapture: boolean;
        audioCapture: boolean;
        memoryRead: boolean;
        memoryWrite: boolean;
        saveState: boolean;
        debugSymbols: boolean;
        cloudSaves: boolean;
        symbols: boolean;
    };
    capture: (...args: unknown[]) => Promise<unknown>;
    sendInput: (args_0: unknown[], ...args: unknown[]) => Promise<void>;
}, {
    start: (...args: unknown[]) => Promise<void>;
    name: string;
    stop: (...args: unknown[]) => Promise<void>;
    initialize: (...args: unknown[]) => Promise<void>;
    getState: (...args: unknown[]) => Promise<any>;
    capabilities: {
        achievements: boolean;
        videoCapture: boolean;
        audioCapture: boolean;
        memoryRead: boolean;
        memoryWrite: boolean;
        saveState: boolean;
        debugSymbols: boolean;
        cloudSaves: boolean;
        symbols: boolean;
    };
    capture: (...args: unknown[]) => Promise<unknown>;
    sendInput: (args_0: unknown[], ...args: unknown[]) => Promise<void>;
}>;
//# sourceMappingURL=platform.schema.d.ts.map