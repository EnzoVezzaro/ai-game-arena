import { htmlAdapter } from './html-adapter';
import { canvasAdapter } from './canvas-adapter';
import { unityAdapter } from './unity-adapter';

export const converters = {
  html: htmlAdapter,
  canvas: canvasAdapter,
  unity_webgl: unityAdapter,
} as const;

export type ConverterFormat = keyof typeof converters;
