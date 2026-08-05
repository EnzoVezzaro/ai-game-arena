import { z } from 'zod';

export const PlatformCapabilitiesSchema = z.object({
  videoCapture: z.boolean(),
  audioCapture: z.boolean(),
  memoryRead: z.boolean(),
  memoryWrite: z.boolean(),
  saveState: z.boolean(),
  debugSymbols: z.boolean(),
  achievements: z.boolean(),
  cloudSaves: z.boolean(),
  symbols: z.boolean(),
});

export const PlatformSchema = z.object({
  name: z.string().min(1),
  capabilities: PlatformCapabilitiesSchema,
  initialize: z.function().returns(z.promise(z.void())),
  start: z.function().returns(z.promise(z.void())),
  stop: z.function().returns(z.promise(z.void())),
  capture: z.function().returns(z.promise(z.unknown())),
  sendInput: z.function().args(z.array(z.unknown())).returns(z.promise(z.void())),
  getState: z.function().returns(z.promise(z.any())),
});
