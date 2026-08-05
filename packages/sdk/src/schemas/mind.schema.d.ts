import { z } from 'zod';
export declare const IntentSchema: z.ZodObject<{
    type: z.ZodString;
    parameters: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: string;
    parameters: Record<string, unknown>;
}, {
    timestamp: number;
    type: string;
    parameters: Record<string, unknown>;
}>;
export declare const CognitiveModuleSchema: z.ZodObject<{
    name: z.ZodString;
    process: z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    process: (args_0: any, ...args: unknown[]) => Promise<any>;
}, {
    name: string;
    process: (args_0: any, ...args: unknown[]) => Promise<any>;
}>;
export declare const MindSchema: z.ZodObject<{
    id: z.ZodString;
    modules: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        process: z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        process: (args_0: any, ...args: unknown[]) => Promise<any>;
    }, {
        name: string;
        process: (args_0: any, ...args: unknown[]) => Promise<any>;
    }>, "many">;
    decide: z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>;
    addModule: z.ZodFunction<z.ZodTuple<[z.ZodObject<{
        name: z.ZodString;
        process: z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        process: (args_0: any, ...args: unknown[]) => Promise<any>;
    }, {
        name: string;
        process: (args_0: any, ...args: unknown[]) => Promise<any>;
    }>], z.ZodUnknown>, z.ZodVoid>;
    removeModule: z.ZodFunction<z.ZodTuple<[z.ZodString], z.ZodUnknown>, z.ZodVoid>;
}, "strip", z.ZodTypeAny, {
    id: string;
    modules: {
        name: string;
        process: (args_0: any, ...args: unknown[]) => Promise<any>;
    }[];
    decide: (args_0: any, ...args: unknown[]) => Promise<any>;
    addModule: (args_0: {
        name: string;
        process: (args_0: any, ...args: unknown[]) => Promise<any>;
    }, ...args: unknown[]) => void;
    removeModule: (args_0: string, ...args: unknown[]) => void;
}, {
    id: string;
    modules: {
        name: string;
        process: (args_0: any, ...args: unknown[]) => Promise<any>;
    }[];
    decide: (args_0: any, ...args: unknown[]) => Promise<any>;
    addModule: (args_0: {
        name: string;
        process: (args_0: any, ...args: unknown[]) => Promise<any>;
    }, ...args: unknown[]) => void;
    removeModule: (args_0: string, ...args: unknown[]) => void;
}>;
//# sourceMappingURL=mind.schema.d.ts.map