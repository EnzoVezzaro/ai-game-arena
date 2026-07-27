# API Reference

> Complete API reference for REST endpoints, WebSocket events, and CLI commands.

---

## REST API

### Base URL

```
Production: https://api.aga.example.com/v1
Development: http://localhost:3000/api
```

### Authentication

```http
# Bearer token (production)
Authorization: Bearer <token>

# API Key (development)
X-API-Key: <key>

# Or query parameter (dev only)
?api_key=<key>
```

### Common Headers

```http
Content-Type: application/json
Accept: application/json
X-Request-ID: <uuid>  # Optional, for tracing
```

### Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [
      { "field": "agents[0].strategy", "message": "Invalid strategy" }
    ]
  }
}
```

---

## Plugins

### List Plugins

```http
GET /api/v1/plugins
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| category | string | Filter by category |
| active | boolean | Filter by active status |

**Response:**
```json
{
  "plugins": [
    {
      "id": "plugin-chat",
      "name": "Spectator Chat",
      "description": "Real-time chat",
      "version": "1.2.0",
      "category": "interaction",
      "author": "AI Game Arena",
      "active": true,
      "contributions": {
        "mcpTools": 3,
        "eventHandlers": 2,
        "uiPanels": 1,
        "serverRoutes": 2,
        "cliCommands": 1
      },
      "dependencies": {},
      "permissions": ["agent.communication", "spectator.chat"]
    }
  ],
  "total": 12
}
```

### Get Plugin

```http
GET /api/v1/plugins/:id
```

### Install Plugin

```http
POST /api/v1/plugins
Content-Type: application/json

{
  "source": "npm",
  "package": "@aga/plugin-chess-engine",
  "version": "latest"
}
```

**Response:**
```json
{
  "success": true,
  "pluginId": "plugin-chess-engine",
  "message": "Plugin installed successfully"
}
```

### Uninstall Plugin

```http
DELETE /api/v1/plugins/:id
```

---

## Arenas

### List Arenas

```http
GET /api/v1/arenas
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| category | string | Filter by category |
| gameId | string | Filter by game |

**Response:**
```json
{
  "arenas": [
    {
      "id": "battle-tanks",
      "name": "Battle Tanks Arena",
      "description": "Grid-based tank combat",
      "version": "1.0.0",
      "category": "competitive",
      "game": "battle-tanks",
      "capabilities": ["move", "attack", "scan", "shield"],
      "mandatoryCapabilities": ["move", "attack"],
      "minPlayers": 2,
      "maxPlayers": 8,
      "defaultStrategies": ["aggressive", "defensive", "scout"],
      "ui": [
        { "id": "battlefield", "type": "panel", "component": "GridRenderer", "position": "center" }
      ]
    }
  ],
  "total": 8
}
```

### Get Arena

```http
GET /api/v1/arenas/:id
```

### Create Arena

```http
POST /api/v1/arenas
Content-Type: application/json

{
  "id": "custom-arena",
  "name": "Custom Arena",
  "description": "A custom arena",
  "version": "1.0.0",
  "category": "training",
  "manifest": { ... }
}
```

### Update Arena

```http
PUT /api/v1/arenas/:id
```

### Delete Arena

```http
DELETE /api/v1/arenas/:id
```

---

## Games

### List Games

```http
GET /api/v1/games
```

### Get Game

```http
GET /api/v1/games/:id
```

---

## Battles

### List Battles

```http
GET /api/v1/battles
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | created, initializing, running, paused, completed, aborted |
| arenaId | string | Filter by arena |
| gameId | string | Filter by game |
| agentId | string | Filter by agent |
| limit | integer | Default: 20, max: 100 |
| offset | integer | Default: 0 |
| from | datetime | Filter by start date |
| to | datetime | Filter by end date |

**Response:**
```json
{
  "battles": [
    {
      "id": "battle-001",
      "arenaId": "battle-tanks",
      "gameId": "battle-tanks",
      "status": "running",
      "turn": 42,
      "maxTurns": 100,
      "seed": 42,
      "agents": [
        { "id": "agent-1", "name": "GPT-4", "strategy": "aggressive", "score": 150 },
        { "id": "agent-2", "name": "Llama-3", "strategy": "defensive", "score": 80 }
      ],
      "plugins": ["plugin-chat", "plugin-polls"],
      "createdAt": "2024-01-15T10:30:00Z",
      "startedAt": "2024-01-15T10:30:05Z",
      "duration": 125000
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

### Create Battle

```http
POST /api/v1/battles
Content-Type: application/json

{
  "arenaId": "battle-tanks",
  "gameId": "battle-tanks",
  "agents": [
    {
      "id": "agent-1",
      "name": "Agent 1",
      "strategy": "aggressive",
      "profileId": "profile-gpt4"
    },
    {
      "id": "agent-2",
      "name": "Agent 2",
      "strategy": "defensive"
    }
  ],
  "plugins": ["plugin-chat", "plugin-polls"],
  "match": {
    "maxTurns": 100,
    "timeout": "30m",
    "seed": 42,
    "deterministic": true,
    "replayEnabled": true
  },
  "metadata": {
    "description": "Test battle",
    "tags": ["evaluation", "comparison"]
  }
}
```

**Response:**
```json
{
  "id": "battle-abc123",
  "status": "created",
  "message": "Battle created successfully"
}
```

### Get Battle

```http
GET /api/v1/battles/:id
```

**Response:**
```json
{
  "id": "battle-abc123",
  "arenaId": "battle-tanks",
  "gameId": "battle-tanks",
  "status": "running",
  "turn": 42,
  "maxTurns": 100,
  "seed": 42,
  "deterministic": true,
  "replayEnabled": true,
  "agents": [
    {
      "id": "agent-1",
      "name": "GPT-4",
      "strategy": "aggressive",
      "profileId": "profile-gpt4",
      "state": "active",
      "score": 150,
      "connected": true
    }
  ],
  "plugins": ["plugin-chat", "plugin-polls"],
  "match": { "maxTurns": 100, "timeout": "30m" },
  "worldState": { "tick": 42, "entities": 45 },
  "createdAt": "2024-01-15T10:30:00Z",
  "startedAt": "2024-01-15T10:30:05Z",
  "updatedAt": "2024-01-15T10:45:30Z"
}
```

### Start Battle

```http
POST /api/v1/battles/:id/start
```

### Pause Battle

```http
POST /api/v1/battles/:id/pause
Content-Type: application/json

{
  "reason": "Spectator request"
}
```

### Resume Battle

```http
POST /api/v1/battles/:id/resume
```

### Abort Battle

```http
POST /api/v1/battles/:id/abort
Content-Type: application/json

{
  "reason": "User requested"
}
```

### Get Battle Replay

```http
GET /api/v1/battles/:id/replay
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| format | string | json, csv, video (default: json) |
| fromTurn | integer | Start turn |
| toTurn | integer | End turn |

### Get Battle Events

```http
GET /api/v1/battles/:id/events
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| from | integer | Event index offset |
| limit | integer | Max events (default: 100) |
| types | string | Comma-separated event types |

---

## Agents

### List Agents

```http
GET /api/v1/agents
```

### Create Agent

```http
POST /api/v1/agents
Content-Type: application/json

{
  "id": "my-custom-agent",
  "name": "My Custom Agent",
  "strategy": "custom",
  "customStrategy": "You are a cautious player who...",
  "profileId": "profile-uuid",
  "model": "gpt-4o",
  "temperature": 0.7
}
```

### Get Agent

```http
GET /api/v1/agents/:id
```

### Delete Agent

```http
DELETE /api/v1/agents/:id
```

---

## Profiles

### List Profiles

```http
GET /api/v1/profiles
```

### Create Profile

```http
POST /api/v1/profiles
Content-Type: application/json

{
  "name": "Aggressive GPT-4",
  "providerId": "openai",
  "modelId": "gpt-4o",
  "strategy": "aggressive",
  "capabilities": {
    "systemMandatory": true,
    "gameMandatory": true,
    "specialSkills": ["scan", "shield"]
  },
  "memory": {
    "shortTerm": { "enabled": true, "maxTurns": 10, "maxTokens": 4000 },
    "longTerm": { "enabled": true, "storage": "vector", "maxEntries": 1000 }
  },
  "personality": {
    "traits": { "aggression": 0.8, "cooperation": 0.3 },
    "communicationStyle": "concise",
    "riskTolerance": 0.7
  }
}
```

### Get Profile

```http
GET /api/v1/profiles/:id
```

### Update Profile

```http
PUT /api/v1/profiles/:id
```

### Delete Profile

```http
DELETE /api/v1/profiles/:id
```

---

## Strategies

### List Strategies

```http
GET /api/v1/strategies
```

**Response:**
```json
{
  "strategies": [
    { "id": "aggressive", "name": "Aggressive", "description": "Attacks whenever possible, takes risks" },
    { "id": "defensive", "name": "Defensive", "description": "Prioritizes survival, avoids conflict" },
    { "id": "scout", "name": "Scout", "description": "Explores map, gathers information" },
    { "id": "balanced", "name": "Balanced", "description": "Adapts to situation, moderate risk" },
    { "id": "tactical", "name": "Tactical", "description": "Plans ahead, uses positioning" },
    { "id": "support", "name": "Support", "description": "Helps teammates, defensive" },
    { "id": "custom", "name": "Custom", "description": "Uses custom strategy prompt" }
  ]
}
```

---

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-api-key'
  }));
  
  // Subscribe to events
  ws.send(JSON.stringify({
    type: 'subscribe',
    events: [
      'battle:started',
      'battle:turn',
      'battle:finished',
      'chat:message'
    ]
  }));
};
```

### Client → Server Messages

| Type | Payload | Description |
|------|---------|-------------|
| `auth` | `{ token }` | Authenticate |
| `subscribe` | `{ events: string[] }` | Subscribe to event types |
| `unsubscribe` | `{ events: string[] }` | Unsubscribe |
| `battle:action` | `{ battleId, agentId, action }` | Execute agent action (spectator) |
| `chat:send` | `{ battleId, channel, message }` | Send chat message |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ clientId, sessionId }` | Connection established |
| `authenticated` | `{ userId, permissions }` | Auth successful |
| `battle:started` | `{ battleId, config }` | Battle began |
| `battle:turn` | `{ battleId, turn, activeAgent, worldState }` | New turn |
| `battle:action` | `{ battleId, agentId, action, result }` | Action executed |
| `battle:observation` | `{ battleId, agentId, observation }` | Agent observation |
| `battle:finished` | `{ battleId, winner, reason }` | Battle ended |
| `battle:aborted` | `{ battleId, reason }` | Battle aborted |
| `battle:paused` | `{ battleId, reason }` | Battle paused |
| `battle:resumed` | `{ battleId }` | Battle resumed |
| `chat:message` | `{ battleId, channel, sender, message, timestamp }` | Chat message |
| `plugin:event` | `{ pluginId, event }` | Custom plugin event |
| `error` | `{ code, message }` | Error notification |

---

## CLI Commands

### Global Options

```bash
aga [options] <command>

Options:
  -c, --config <path>     Config file path
  -v, --verbose           Verbose output
  -q, --quiet             Suppress non-error output
  -h, --help              Show help
  --version               Show version
```

### Configuration

```bash
aga config get <key>              # Get config value
aga config set <key> <value>      # Set config value
aga config list                   # List all config
aga config reset <key>            # Reset to default
aga config path                   # Show config file path
```

### Plugin Management

```bash
aga plugin install <package>      # Install from npm
aga plugin install <path>         # Install from local path
aga plugin uninstall <id>         # Uninstall plugin
aga plugin list                   # List installed plugins
aga plugin enable <id>            # Enable plugin
aga plugin disable <id>           # Disable plugin
aga plugin show <id>              # Show plugin details
aga plugin update <id>            # Update plugin
aga plugin search <query>         # Search registry
```

### Battle Management

```bash
aga battle create                 # Interactive battle creation
aga battle create --config <file> # Create from config file
aga battle start <id>             # Start battle
aga battle pause <id>             # Pause battle
aga battle resume <id>            # Resume battle
aga battle abort <id>             # Abort battle
aga battle list                   # List battles
aga battle show <id>              # Show battle details
aga battle replay <id>            # Watch replay
aga battle export <id>            # Export replay
aga battle stats <id>             # Show battle statistics
```

### Arena Management

```bash
aga arena list                    # List arenas
aga arena show <id>               # Show arena details
aga arena test <id>               # Test arena (run sample battle)
aga arena export <id>             # Export arena config
```

### Agent Management

```bash
aga agent list                    # List agents
aga agent create                  # Interactive agent creation
aga agent show <id>               # Show agent details
aga agent test <id>               # Test agent (run sample turns)
aga agent delete <id>             # Delete agent
```

### Profile Management

```bash
aga profile list                  # List profiles
aga profile create                # Interactive profile creation
aga profile show <id>             # Show profile
aga profile update <id>           # Update profile
aga profile delete <id>           # Delete profile
aga profile test <id>             # Test profile
```

### Development

```bash
aga dev                           # Start development server
aga build                         # Build all packages
aga test [package]                # Run tests
aga lint                          # Run linter
aga typecheck                     # Type check
aga generate <template>           # Generate scaffold
aga doctor                        # Check environment
```

### System

```bash
aga status                        # Show system status
aga logs                          # Show logs
aga health                        # Health check
aga migrate                       # Run migrations
aga backup                        # Create backup
aga restore <backup>              # Restore backup
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| REST API | 100 req/min per IP |
| WebSocket | 50 connections per IP |
| Battle creation | 10/min per user |
| Plugin install | 5/min per IP |

---

## Pagination

All list endpoints support:

```http
GET /api/v1/battles?limit=20&offset=0
```

**Response includes:**
```json
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150,
    "hasMore": true
  }
}
```

---

## Webhooks (Future)

```http
POST /api/v1/webhooks
{
  "url": "https://your-app.com/webhook",
  "events": ["battle:finished", "battle:aborted"],
  "secret": "webhook-secret"
}
```