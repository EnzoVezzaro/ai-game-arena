import { z } from 'zod';

export const IntentSchema = z.object({
  type: z.string().min(1),
  parameters: z.record(z.unknown()),
  timestamp: z.number(),
});

export const CognitiveModuleSchema = z.object({
  name: z.string().min(1),
  process: z.function().args(z.any()).returns(z.promise(z.any())),
});

export const MindSchema = z.object({
  id: z.string().min(1),
  modules: z.array(CognitiveModuleSchema),
  decide: z.function().args(z.any()).returns(z.promise(z.any())),
  addModule: z.function().args(CognitiveModuleSchema).returns(z.void()),
  removeModule: z.function().args(z.string()).returns(z.void()),
});
