import type { ConverterAdapter, ConversionResult, GameFormat } from '@ai-game-arena/sdk';

export const htmlAdapter: ConverterAdapter = {
  format: 'html',
  label: 'HTML5',
  description: 'Converts a single-page HTML game into the arena system',
  async convert(zipPath, options) {
    const gameId = options.gameId ?? `html-game-${Date.now()}`;
    const gameName = options.gameName ?? 'HTML Game';

    return {
      gameId,
      name: gameName,
      format: 'html',
      adapterType: 'web',
      path: zipPath,
      manifest: {
        id: gameId,
        name: gameName,
        description: `HTML5 game converted from zip`,
        version: '1.0.0',
        category: 'game',
        format: 'html',
        adapterType: 'web',
        min_players: 1,
        max_players: 4,
        entry: './index.html',
      },
    };
  },
};
