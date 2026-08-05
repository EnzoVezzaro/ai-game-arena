import { z } from 'zod';
export declare const ObservationFragmentSchema: z.ZodObject<{
    type: z.ZodString;
    data: z.ZodUnknown;
    timestamp: z.ZodNumber;
    agentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: string;
    agentId: string;
    data?: unknown;
}, {
    timestamp: number;
    type: string;
    agentId: string;
    data?: unknown;
}>;
export declare const SensorCapabilitySchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    parameters: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}, {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}>;
export declare const SensorSchema: z.ZodObject<{
    name: z.ZodString;
    capture: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>;
    process: z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>;
    produce: z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    capture: (...args: unknown[]) => Promise<any>;
    process: (args_0: any, ...args: unknown[]) => Promise<any>;
    produce: (args_0: any, ...args: unknown[]) => Promise<unknown>;
}, {
    name: string;
    capture: (...args: unknown[]) => Promise<any>;
    process: (args_0: any, ...args: unknown[]) => Promise<any>;
    produce: (args_0: any, ...args: unknown[]) => Promise<unknown>;
}>;
//# sourceMappingURL=sensor.schema.d.ts.map