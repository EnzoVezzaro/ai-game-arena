import type { PluginContext, GameConverter, ConverterAdapter, GameFormat } from '@ai-game-arena/sdk';
import { converters } from './adapters';

const FORMAT_LABELS: Record<GameFormat, string> = {
  html: 'HTML5 Game',
  canvas: 'Canvas 2D Game',
  unity_webgl: 'Unity WebGL Game',
  dom: 'DOM Game',
  embed_url: 'Embed URL Game',
  native: 'Native Bridge Game',
};

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
    async convert(zipPath, format, options) {
      const adapter = converters[format];
      if (!adapter) {
        throw new Error(`Unsupported format: ${format}`);
      }
      return adapter.convert(zipPath, options);
    },
  };

  ctx.registerGameConverter(gameConverter);

  ctx.logger.info(`Registered converter for formats: ${Object.keys(converters).join(', ')}`, {
    component: 'plugin-game-converter',
  });
}

export async function deactivate(_ctx: PluginContext): Promise<void> {
  // Cleanup if needed
}
