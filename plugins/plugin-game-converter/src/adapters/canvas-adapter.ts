import type { ConverterAdapter, ConversionResult, GameFormat } from '@ai-game-arena/sdk';

export const canvasAdapter: ConverterAdapter = {
  format: 'canvas',
  label: 'Canvas 2D',
  description: 'Converts a Canvas 2D game into the arena system',
  async convert(zipPath, options) {
    const gameId = options.gameId ?? `canvas-game-${Date.now()}`;
    const gameName = options.gameName ?? 'Canvas Game';

    return {
      gameId,
      name: gameName,
      format: 'canvas',
      adapterType: 'canvas',
      path: zipPath,
      manifest: {
        id: gameId,
        name: gameName,
        description: `Canvas 2D game converted from zip`,
        version: '1.0.0',
        category: 'game',
        format: 'canvas',
        adapterType: 'canvas',
        min_players: 1,
        max_players: 4,
        entry: './dist/index.js',
      },
    };
  },
};
