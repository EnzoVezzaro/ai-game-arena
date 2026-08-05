import { z } from 'zod';

export const MemoryEntrySchema = z.object({
  id: z.string().min(1),
  content: z.string(),
  timestamp: z.number(),
  importance: z.number(),
  tags: z.array(z.string()),
});

export const MemoryProviderSchema = z.object({
  store: z.function().args(z.any()).returns(z.promise(z.void())),
  retrieve: z.function().args(z.string()).returns(z.promise(z.array(z.any()))),
  search: z.function().args(z.string()).returns(z.promise(z.array(z.any()))),
  forget: z.function().args(z.string()).returns(z.promise(z.void())),
});

export const IdentitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  traits: z.record(z.unknown()),
  relationships: z.record(z.unknown()),
  inventory: z.record(z.unknown()),
  knowledge: z.record(z.unknown()),
  memories: z.array(MemoryEntrySchema),
  goals: z.array(z.string()),
  statistics: z.record(z.unknown()),
});
