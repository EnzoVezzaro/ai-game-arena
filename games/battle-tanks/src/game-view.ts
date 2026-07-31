import type { BattleTanksState } from './game';

/**
 * The battle-tanks game's own renderer.
 *
 * This is part of the GAME itself (games/battle-tanks). It produces a
 * self-contained HTML5 canvas game that runs standalone in any browser: it
 * draws the board, tanks, health bars and winner from an embedded snapshot,
 * and supports local keyboard play (WASD/arrows) when opened directly.
 *
 * The system never contains this logic. The bridge simply serves this HTML to
 * the engine, which embeds it in an iframe so spectators watch the actual game.
 */

const TANK_COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#f472b6'];
const TANK_SYMBOLS = ['▲', '▼', '◀', '▶'];

export interface TankUnit {
  agent_id: string;
  x: number;
  y: number;
  hp: number;
  alive: boolean;
  color: string;
  symbol: string;
}

export function toUnits(state: BattleTanksState): TankUnit[] {
  return Object.entries(state.tanks).map(([agentId, tank], index) => ({
    agent_id: agentId,
    x: tank.x,
    y: tank.y,
    hp: tank.health,
    alive: tank.alive,
    color: TANK_COLORS[index % TANK_COLORS.length] ?? '#34d399',
    symbol: TANK_SYMBOLS[index % TANK_SYMBOLS.length] ?? '▲',
  }));
}

function tankName(agentId: string): string {
  return agentId.length > 10 ? `${agentId.slice(0, 8)}…` : agentId;
}

function tankCellStyle(color: string): string {
  return `background:${color}22;border:2px solid ${color};color:${color}`;
}

export function renderGameHtml(state: BattleTanksState, winner: string | null): string {
  const units = toUnits(state);
  const gridCells = Array.from(
    { length: state.gridWidth * state.gridHeight },
    (_, i) => ({ x: i % state.gridWidth, y: Math.floor(i / state.gridWidth) }),
  );
  const unitAt = (x: number, y: number): TankUnit | undefined =>
    units.find((u) => u.alive && u.x === x && u.y === y);
  const safeState = JSON.stringify({ ...state, winner }).replace(/</g, '\\u003c');

  const tankCells = units
    .map(
      (unit, index) => `
      <div class="tank" data-idx="${index}" style="${tankCellStyle(unit.color)}">
        <span class="sym">${unit.symbol}</span>
        <span class="name">${tankName(unit.agent_id)}</span>
        <span class="hp">HP ${unit.hp}</span>
        <span class="hpbar"><i style="width:${Math.max(0, Math.min(100, unit.hp))}%"></i></span>
      </div>`,
    )
    .join('');

  const cellsHtml = gridCells
    .map((c) => {
      const unit = unitAt(c.x, c.y);
      const occupied = unit
        ? `<div class="tank" data-idx="${units.indexOf(unit)}" style="${tankCellStyle(unit.color)}"><span class="sym">${unit.symbol}</span><span class="hpbar"><i style="width:${Math.max(0, Math.min(100, unit.hp))}%"></i></span></div>`
        : '';
      return `<div class="cell" data-x="${c.x}" data-y="${c.y}">${occupied}</div>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Battle Tanks</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: radial-gradient(40rem 40rem at 50% 0%, #10b98114, transparent 60%), #0b0f14; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #e5e7eb; }
  .wrap { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 20px; }
  .hud { display: flex; gap: 18px; align-items: center; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #9ca3af; }
  .hud b { color: #34d399; }
  .board { display: grid; gap: 3px; padding: 10px; background: #11161d; border: 1px solid #1f2937; border-radius: 14px; box-shadow: 0 0 0 1px #0004, 0 18px 40px #0008; width: min(100%, 460px); }
  .cell { aspect-ratio: 1 / 1; background: #151b23; border-radius: 8px; display: flex; align-items: center; justify-content: center; position: relative; }
  .tank { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 86%; height: 86%; border-radius: 9px; position: relative; animation: pop .35s ease; }
  .tank .sym { font-size: 17px; line-height: 1; }
  .tank .name { font-size: 7px; margin-top: 2px; max-width: 46px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .tank .hp { font-size: 7px; opacity: .85; }
  .hpbar { width: 80%; height: 4px; background: #0009; border-radius: 99px; margin-top: 2px; overflow: hidden; }
  .hpbar i { display: block; height: 100%; background: linear-gradient(90deg, #34d399, #a3e635); }
  @keyframes pop { 0% { transform: scale(.6); opacity: .4; } 100% { transform: scale(1); opacity: 1; } }
  .roster { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
  .roster .u { display: flex; align-items: center; gap: 7px; border: 1px solid #1f2937; background: #11161d; padding: 6px 10px; border-radius: 10px; font-size: 10px; }
  .roster .dot { width: 9px; height: 9px; border-radius: 99px; }
  .banner { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: #000a; z-index: 5; }
  .banner div { font-size: 30px; font-weight: 800; letter-spacing: .08em; padding: 18px 30px; border-radius: 16px; background: linear-gradient(140deg, #11161d, #0b0f14); border: 1px solid #34d39966; color: #34d399; text-shadow: 0 0 24px #34d39966; }
  .hint { font-size: 9px; color: #6b7280; text-align: center; max-width: 520px; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="hud"><span>Battle Tanks</span><span>TURN <b>${state.turn}</b></span><span>PHASE <b>${state.phase}</b></span></div>
    <div class="board" style="grid-template-columns:repeat(${state.gridWidth}, 1fr);grid-template-rows:repeat(${state.gridHeight}, 1fr)">${cellsHtml}</div>
    <div class="roster">${tankCells}</div>
    <div class="hint">Standalone game — use WASD / arrow keys to drive your tank locally. When hosted by AI Game Arena, the bridge drives it from the engine.</div>
  </div>
  ${winner && state.phase !== 'running' ? `<div class="banner"><div>🏆 ${tankName(winner)} WINS</div></div>` : ''}
<script>
  (function () {
    var STATE = ${safeState};
    var COLORS = ${JSON.stringify(TANK_COLORS)};
    var SYMBOLS = ${JSON.stringify(TANK_SYMBOLS)};
    var KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
    var player = Object.keys(STATE.tanks)[0] || null;
    function draw() {
      var ids = Object.keys(STATE.tanks);
      document.querySelectorAll('.cell').forEach(function (cell) {
        var x = Number(cell.dataset.x), y = Number(cell.dataset.y);
        var found = null;
        for (var i = 0; i < ids.length; i++) {
          var t = STATE.tanks[ids[i]];
          if (t.alive && t.x === x && t.y === y) { found = { id: ids[i], t: t, i: i }; break; }
        }
        cell.innerHTML = found
          ? '<div class="tank" style="background:' + COLORS[found.i % COLORS.length] + '22;border:2px solid ' + COLORS[found.i % COLORS.length] + ';color:' + COLORS[found.i % COLORS.length] + '"><span class="sym">' + SYMBOLS[found.i % SYMBOLS.length] + '</span><span class="hpbar"><i style="width:' + Math.max(0, Math.min(100, found.t.health)) + '%"></i></span></div>'
          : '';
      });
    }
    window.addEventListener('keydown', function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      var d = KEYS[k];
      if (!player || !d || STATE.phase !== 'running') return;
      e.preventDefault();
      var t = STATE.tanks[player];
      if (!t || !t.alive) return;
      var nx = Math.max(0, Math.min(STATE.gridWidth - 1, t.x + d[0]));
      var ny = Math.max(0, Math.min(STATE.gridHeight - 1, t.y + d[1]));
      var taken = Object.keys(STATE.tanks).some(function (id) {
        var o = STATE.tanks[id];
        return o !== t && o.alive && o.x === nx && o.y === ny;
      });
      if (taken) return;
      t.x = nx; t.y = ny;
      draw();
    });
  })();
</script>
</body>
</html>`;
}
