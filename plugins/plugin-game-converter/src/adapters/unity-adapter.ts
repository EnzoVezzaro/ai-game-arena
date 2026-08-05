import type { ConverterAdapter, ConversionResult, GameFormat } from '@ai-game-arena/sdk';

export const unityAdapter: ConverterAdapter = {
  format: 'unity_webgl',
  label: 'Unity WebGL',
  description: 'Converts a Unity WebGL build into the arena system',
  async convert(zipPath, options) {
    const gameId = options.gameId ?? `unity-game-${Date.now()}`;
    const gameName = options.gameName ?? 'Unity Game';

    return {
      gameId,
      name: gameName,
      format: 'unity_webgl',
      adapterType: 'web',
      path: zipPath,
      manifest: {
        id: gameId,
        name: gameName,
        description: `Unity WebGL game converted from zip`,
        version: '1.0.0',
        category: 'game',
        format: 'unity_webgl',
        adapterType: 'web',
        min_players: 1,
        max_players: 4,
        entry: './Build/index.html',
      },
    };
  },
};
