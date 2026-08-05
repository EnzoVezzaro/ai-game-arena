import { z } from 'zod';

export const ObservationFragmentSchema = z.object({
  type: z.string(),
  data: z.unknown(),
  timestamp: z.number(),
  agentId: z.string(),
});

export const SensorCapabilitySchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  parameters: z.record(z.unknown()),
});

export const SensorSchema = z.object({
  name: z.string().min(1),
  capture: z.function().returns(z.promise(z.any())),
  process: z.function().args(z.any()).returns(z.promise(z.any())),
  produce: z.function().args(z.any()).returns(z.promise(z.unknown())),
});
