import { SqliteStorage } from '@ai-game-arena/storage';

export async function replayCommand(rawArgs: string[]) {
  const battleId = rawArgs[0];
  if (!battleId) {
    console.error('Usage: arena replay <battleId>');
    process.exit(1);
  }

  const storage = new SqliteStorage('./data/arena.db');
  const events = await storage.all<{ type: string; timestamp: number; payload: string; metadata: string }>(
    'SELECT type, timestamp, payload, metadata FROM events WHERE aggregateId = ? ORDER BY timestamp',
    [battleId],
  );

  if (events.length === 0) {
    console.error(`No events found for battle ${battleId}`);
    process.exit(1);
  }

  console.log(`🎬 Replaying battle ${battleId} (${events.length} events)\n`);

  for (const e of events) {
    const ts = new Date(e.timestamp).toISOString();
    const payload = JSON.parse(e.payload);
    console.log(`[${ts}] ${e.type}  ${JSON.stringify(payload)}`);
  }

  console.log(`\n✅ Replay complete`);
}