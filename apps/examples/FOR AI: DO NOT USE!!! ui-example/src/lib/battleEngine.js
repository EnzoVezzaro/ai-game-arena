// Pure battle simulation engine — battle-tanks style grid arena.
// The AI "manipulates its Controller (MCP)" by emitting tool actions
// (move / attack / pass / communicate), exactly like a human pressing keys.

const DIRS = [
  { name: "north", dx: 0, dy: -1 },
  { name: "south", dx: 0, dy: 1 },
  { name: "east", dx: 1, dy: 0 },
  { name: "west", dx: -1, dy: 0 }
];

function rng(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function initBattleState(agents, gridSize = 8) {
  const n = gridSize;
  // place agents on opposing edges, spread out
  const positions = [];
  const left = agents.length <= 2;
  agents.forEach((a, i) => {
    const side = i % 2 === 0;
    const x = left ? (side ? 1 : n - 2) : (i < agents.length / 2 ? 1 : n - 2);
    const y = Math.max(1, Math.min(n - 2, Math.round(((i + 1) / (agents.length + 1)) * (n - 2)) + 1));
    positions.push({ x, y });
  });
  const units = agents.map((a, i) => ({
    agent_id: a.id,
    name: a.name,
    color: a.avatar_color || "#38bdf8",
    symbol: a.symbol || a.name?.[0] || "?",
    strategy: a.strategy || "balanced",
    x: positions[i].x,
    y: positions[i].y,
    hp: 100,
    maxHp: 100,
    alive: true,
    score: 0,
    damageDealt: 0,
    lastAction: null,
    lastTarget: null
  }));
  return { grid_size: n, units, turn: 0, log: [] };
}

function manhattan(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }

function chooseAction(unit, units, turn) {
  const enemies = units.filter(u => u.alive && u.agent_id !== unit.agent_id);
  if (!enemies.length) return { type: "pass" };
  const nearest = enemies.reduce((best, e) => manhattan(unit, e) < manhattan(unit, best) ? e : best, enemies[0]);
  const dist = manhattan(unit, nearest);
  const adj = dist === 1;
  const lowHp = unit.hp < 35;

  // strategy flavour
  if (turn < 2 && unit.strategy === "scout") return { type: "move", dir: pick(DIRS).name, note: "probing perimeter" };
  if (unit.strategy === "aggressive" || (unit.strategy === "balanced" && !lowHp)) {
    if (adj) return { type: "attack", target: nearest, note: "engaging target" };
    return { type: "move", dir: toward(unit, nearest), note: "closing distance" };
  }
  if (unit.strategy === "defensive" || lowHp) {
    if (adj) return { type: "attack", target: nearest, note: "counter-attack" };
    if (lowHp) return { type: "move", dir: away(unit, nearest), note: "retreating" };
    return { type: "pass", note: "holding position" };
  }
  // llm / balanced
  if (adj) return { type: "attack", target: nearest, note: "calculated strike" };
  return Math.random() < 0.75
    ? { type: "move", dir: toward(unit, nearest), note: "repositioning" }
    : { type: "pass", note: "evaluating state" };
}

function toward(unit, target) {
  if (Math.abs(target.x - unit.x) >= Math.abs(target.y - unit.y)) {
    return (target.x > unit.x ? "east" : "west");
  }
  return (target.y > unit.y ? "south" : "north");
}
function away(unit, target) {
  if (Math.abs(target.x - unit.x) >= Math.abs(target.y - unit.y)) {
    return (target.x > unit.x ? "west" : "east");
  }
  return (target.y > unit.y ? "north" : "south");
}

function dirDelta(name) {
  return DIRS.find(d => d.name === name) || DIRS[0];
}

function inBounds(v, n) { return v >= 0 && v < n; }

export function stepTurn(state, agents) {
  const s = { ...state, units: state.units.map(u => ({ ...u })) };
  s.turn = state.turn + 1;
  const events = [];
  const push = (e) => events.push(e);

  push({ type: "TURN_STARTED", turn: s.turn, summary: `Turn ${s.turn} begins` });

  const aliveUnits = s.units.filter(u => u.alive);
  const order = [...aliveUnits].sort(() => Math.random() - 0.5);

  for (const unit of order) {
    if (!unit.alive) continue;
    // Observation
    const obsEnemies = s.units.filter(u => u.alive && u.agent_id !== unit.agent_id).length;
    push({
      type: "OBSERVATION_CREATED",
      agent_id: unit.agent_id,
      turn: s.turn,
      summary: `${unit.name} perceived ${obsEnemies} hostile(s), HP ${unit.hp}`,
      payload: { hp: unit.hp, hostiles: obsEnemies, pos: { x: unit.x, y: unit.y } }
    });

    const action = chooseAction(unit, s.units, s.turn);
    const toolName = action.type === "attack" ? "controller.attack" : action.type === "move" ? "controller.move" : "controller.pass";
    push({
      type: "TOOL_REQUESTED",
      agent_id: unit.agent_id,
      turn: s.turn,
      summary: `${unit.name} → ${toolName}(${action.dir || action.type})`,
      payload: { tool: toolName, dir: action.dir, note: action.note }
    });

    if (action.type === "move") {
      const d = dirDelta(action.dir);
      const nx = unit.x + d.dx, ny = unit.y + d.dy;
      const occupied = s.units.some(u => u.alive && u.x === nx && u.y === ny);
      if (inBounds(nx, s.grid_size) && inBounds(ny, s.grid_size) && !occupied) {
        unit.x = nx; unit.y = ny;
        unit.lastAction = { kind: "move", dir: action.dir };
        push({ type: "TOOL_EXECUTED", agent_id: unit.agent_id, turn: s.turn, summary: `${unit.name} moved ${action.dir}`, payload: { x: nx, y: ny } });
        push({ type: "STATE_CHANGED", agent_id: unit.agent_id, turn: s.turn, summary: `${unit.name} repositioned to (${nx},${ny})` });
      } else {
        unit.lastAction = { kind: "blocked" };
        push({ type: "TOOL_EXECUTED", agent_id: unit.agent_id, turn: s.turn, summary: `${unit.name} blocked ${action.dir}` });
      }
    } else if (action.type === "attack") {
      const tgt = action.target;
      const dmg = rng(16, 30);
      const tgtUnit = s.units.find(u => u.agent_id === tgt.agent_id);
      if (tgtUnit && tgtUnit.alive) {
        tgtUnit.hp = Math.max(0, tgtUnit.hp - dmg);
        unit.damageDealt += dmg;
        unit.lastAction = { kind: "attack", target: { x: tgtUnit.x, y: tgtUnit.y } };
        tgtUnit.lastAction = { kind: "hit", from: { x: unit.x, y: unit.y } };
        push({ type: "TOOL_EXECUTED", agent_id: unit.agent_id, turn: s.turn, summary: `${unit.name} struck ${tgtUnit.name} for ${dmg}`, payload: { target: tgtUnit.agent_id, damage: dmg, hp: tgtUnit.hp } });
        push({ type: "STATE_CHANGED", agent_id: unit.agent_id, turn: s.turn, summary: `${tgtUnit.name} HP ${tgtUnit.hp} (${tgtUnit.hp <= 0 ? "eliminated" : "wounded"})` });
        if (tgtUnit.hp <= 0) {
          tgtUnit.alive = false;
          push({ type: "AGENT_LEFT", agent_id: tgtUnit.agent_id, turn: s.turn, summary: `${tgtUnit.name} eliminated by ${unit.name}` });
        }
      }
    } else {
      unit.lastAction = { kind: "pass" };
      push({ type: "TOOL_EXECUTED", agent_id: unit.agent_id, turn: s.turn, summary: `${unit.name} yielded turn` });
    }

    // occasional comms
    if (Math.random() < 0.18 && action.type !== "pass") {
      const lines = [
        "I've got the angle on you.",
        "Repositioning — cover the flank.",
        "Predicting your next move.",
        "This grid is mine.",
        "Reading the field.",
        "You're exposed."
      ];
      push({ type: "MESSAGE_SENT", agent_id: unit.agent_id, turn: s.turn, summary: `${unit.name}: ${pick(lines)}`, payload: { channel: "team" } });
    }
  }

  // scoring + survival
  for (const u of s.units) {
    u.score = u.damageDealt + (u.alive ? 25 : 0) + (u.alive ? s.turn * 2 : 0);
  }
  push({
    type: "SCORE_UPDATED",
    turn: s.turn,
    summary: `Scores tallied — ${s.units.filter(u => u.alive).length} standing`,
    payload: { scores: s.units.map(u => ({ agent_id: u.agent_id, score: u.score, hp: u.hp, alive: u.alive })) }
  });

  const aliveCount = s.units.filter(u => u.alive).length;
  const finished = aliveCount <= 1 || s.turn >= (state.maxTurns || 30);
  if (finished) {
    const winner = [...s.units].sort((a, b) => b.score - a.score)[0];
    push({ type: "MATCH_FINISHED", turn: s.turn, summary: `Match concluded — ${winner.name} victorious`, payload: { winner_agent_id: winner.agent_id, scores: s.units.map(u => ({ agent_id: u.agent_id, score: u.score, hp: u.hp, alive: u.alive })) } });
  }

  return { state: s, events, finished, winnerId: finished ? [...s.units].sort((a, b) => b.score - a.score)[0]?.agent_id : null };
}