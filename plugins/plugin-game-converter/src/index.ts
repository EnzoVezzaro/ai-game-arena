import type { PluginContext, GameConverter, ConverterAdapter, GameFormat, ConverterOptions, ConversionResult } from '@ai-game-arena/sdk';
import { converters } from './adapters';


export async function activate(ctx: PluginContext): Promise<void> {
  ctx.logger.info('Game Converter plugin activated', { component: 'plugin-game-converter' });

  const adapterList: ConverterAdapter[] = Object.values(converters);

  const gameConverter: GameConverter = {
    id: 'plugin-game-converter',
    name: 'Game Converter',
    description: 'Converts games from HTML, Canvas, and Unity WebGL formats into the arena system',
    version: '1.0.0',
    formats: Object.keys(converters) as GameFormat[],
    adapters: adapterList,
    async convert(zipPath: string, format: GameFormat, options: ConverterOptions): Promise<ConversionResult> {
      const adapter = converters[format as keyof typeof converters];
      if (!adapter) {
        throw new Error(`Unsupported format: ${format}`);
      }
      return adapter.convert(zipPath, options);
    },
}

export async function deactivate(_ctx: PluginContext): Promise<void> {
  // Cleanup if needed
}
