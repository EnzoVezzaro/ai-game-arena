import { SqliteStorage } from '@ai-game-arena/storage';

interface ProfileRow {
  id: string;
  name: string;
  data: string;
  created_at: number;
}

export async function profileCommand(rawArgs: string[]) {
  const subcommand = rawArgs[0] || 'list';

  if (subcommand === 'list') {
    await listProfiles();
  } else if (subcommand === 'create') {
    await createProfile(rawArgs.slice(1));
  } else {
    console.error(`Usage: arena profile [list|create] [args]`);
    process.exit(1);
  }
}

async function listProfiles() {
  const storage = new SqliteStorage('./data/arena.db');
  const profiles = await storage.all<ProfileRow>('SELECT * FROM profiles ORDER BY name');
  console.log(`📋 ${profiles.length} profile(s):\n`);
  for (const p of profiles) {
    console.log(`  ${p.id}  ${p.name}`);
  }
}

async function createProfile(args: string[]) {
  const name = args[0];
  if (!name) {
    console.error('Usage: arena profile create <name> [data-json]');
    process.exit(1);
  }
  const data = args[1] ? JSON.parse(args[1]) : {};
  const storage = new SqliteStorage('./data/arena.db');
  const id = `profile-${Date.now()}`;
  await storage.run(
    'INSERT INTO profiles (id, name, data, created_at) VALUES (?, ?, ?, ?)',
    [id, name, JSON.stringify(data), Date.now()],
  );
  console.log(`Created profile: ${id} (${name})`);
}