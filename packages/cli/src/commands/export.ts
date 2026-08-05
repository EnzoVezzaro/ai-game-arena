import { ConsoleLogger, InProcessEventBus } from '@ai-game-arena/kernel';
import { Runtime } from '@ai-game-arena/battle-runtime';
import { SqliteStorage } from '@ai-game-arena/storage';

export async function exportCommand(rawArgs: string[]) {
  const battleId = rawArgs[0];
  if (!battleId) {
    console.error('Usage: arena export <battleId>');
    process.exit(1);
  }

  const logger = new ConsoleLogger('warn', { component: 'cli' });
  const eventBus = new InProcessEventBus();
  const storage = new SqliteStorage('./data/arena.db');
  const runtime = new Runtime({ logger, eventBus, storage });

  const battle = runtime.getBattle(battleId);
  const events = await storage.all<{ type: string; timestamp: number; payload: string; metadata: string }>(
    'SELECT type, timestamp, payload, metadata FROM events WHERE aggregateId = ? ORDER BY timestamp',
    [battleId],
  );

  const exportData = {
    battleId,
    battle: battle
      ? {
          id: battle.id,
          arenaId: battle.arenaId,
          state: battle.state,
          createdAt: battle.createdAt,
        }
      : null,
    events: events.map((e) => ({
      type: e.type,
      timestamp: e.timestamp,
      payload: JSON.parse(e.payload),
      metadata: JSON.parse(e.metadata),
    })),
    exportedAt: new Date().toISOString(),
  };

  const filename = `battle-${battleId}.json`;
  await Bun.write(filename, JSON.stringify(exportData, null, 2));
  console.log(`Exported battle ${battleId} to ${filename}`);
}