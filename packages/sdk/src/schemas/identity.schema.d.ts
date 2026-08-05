import { z } from 'zod';
export declare const MemoryEntrySchema: z.ZodObject<{
    id: z.ZodString;
    content: z.ZodString;
    timestamp: z.ZodNumber;
    importance: z.ZodNumber;
    tags: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    id: string;
    content: string;
    importance: number;
    tags: string[];
}, {
    timestamp: number;
    id: string;
    content: string;
    importance: number;
    tags: string[];
}>;
export declare const MemoryProviderSchema: z.ZodObject<{
    store: z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>;
    retrieve: z.ZodFunction<z.ZodTuple<[z.ZodString], z.ZodUnknown>, z.ZodPromise<z.ZodArray<z.ZodAny, "many">>>;
    search: z.ZodFunction<z.ZodTuple<[z.ZodString], z.ZodUnknown>, z.ZodPromise<z.ZodArray<z.ZodAny, "many">>>;
    forget: z.ZodFunction<z.ZodTuple<[z.ZodString], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>;
}, "strip", z.ZodTypeAny, {
    search: (args_0: string, ...args: unknown[]) => Promise<any[]>;
    store: (args_0: any, ...args: unknown[]) => Promise<void>;
    retrieve: (args_0: string, ...args: unknown[]) => Promise<any[]>;
    forget: (args_0: string, ...args: unknown[]) => Promise<void>;
}, {
    search: (args_0: string, ...args: unknown[]) => Promise<any[]>;
    store: (args_0: any, ...args: unknown[]) => Promise<void>;
    retrieve: (args_0: string, ...args: unknown[]) => Promise<any[]>;
    forget: (args_0: string, ...args: unknown[]) => Promise<void>;
}>;
export declare const IdentitySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    traits: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    relationships: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    inventory: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    knowledge: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    memories: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        content: z.ZodString;
        timestamp: z.ZodNumber;
        importance: z.ZodNumber;
        tags: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        timestamp: number;
        id: string;
        content: string;
        importance: number;
        tags: string[];
    }, {
        timestamp: number;
        id: string;
        content: string;
        importance: number;
        tags: string[];
    }>, "many">;
    goals: z.ZodArray<z.ZodString, "many">;
    statistics: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    traits: Record<string, unknown>;
    relationships: Record<string, unknown>;
    inventory: Record<string, unknown>;
    knowledge: Record<string, unknown>;
    memories: {
        timestamp: number;
        id: string;
        content: string;
        importance: number;
        tags: string[];
    }[];
    goals: string[];
    statistics: Record<string, unknown>;
}, {
    id: string;
    name: string;
    traits: Record<string, unknown>;
    relationships: Record<string, unknown>;
    inventory: Record<string, unknown>;
    knowledge: Record<string, unknown>;
    memories: {
        timestamp: number;
        id: string;
        content: string;
        importance: number;
        tags: string[];
    }[];
    goals: string[];
    statistics: Record<string, unknown>;
}>;
//# sourceMappingURL=identity.schema.d.ts.map