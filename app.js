const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WORLD = { width: 1600, height: 900 };
const FIXED_STEP = 1 / 60;
const MIN_SCORE_TO_WIN = 3;
const MIN_TEAM_SIZE = 1;
const MAX_TEAM_SIZE = 6;
const DEFAULT_CONFIG = { friendlyCount: 2, enemyCount: 2 };
const TANK_RADIUS = 22;
const MAX_HP = 100;
const PLAYER_SPEED = 268;
const BOT_SPEED = 236;
const BULLET_SPEED = 760;
const BULLET_LIFETIME = 1.55;
const BULLET_DAMAGE = 34;
const BASE_FIRE_COOLDOWN = 0.42;
const RAPID_FIRE_COOLDOWN = 0.18;
const POWERUP_DURATION = 3;
const RESPAWN_TIME = 2.15;
const PICKUP_RESPAWN = 7.8;
const PICKUP_RADIUS = 22;
const PICKUP_SEARCH_STEP = 32;
const PICKUP_SEARCH_MAX_RINGS = 10;
const PICKUP_ACCESS_PROBE_STEP = 16;
const STAR_DURATION = 5;
const MUSHROOM_DURATION = 9;
const STAR_SPEED_MULTIPLIER = 1.5;
const MUSHROOM_SCALE = 1.28;
const MUSHROOM_BULLET_SCALE = 1.6;
const SHELL_SPEED = 340;
const SHELL_DAMAGE = 24;
const SHELL_LIFETIME = 15;
const NEUTRAL_TANK_HP = 72;

const TEAM_META = {
  blue: {
    id: "blue",
    name: "Blue Team",
    short: "BLUE",
    side: "left",
    accent: "#fff1b1",
    bullet: "#e7fbff",
    colors: ["#79d6ff", "#5ac9ff", "#4d9fff", "#7be3ff", "#5cc0d8", "#90b7ff"],
  },
  red: {
    id: "red",
    name: "Red Team",
    short: "RED",
    side: "right",
    accent: "#ffe8d9",
    bullet: "#ffe6d7",
    colors: ["#ff876c", "#ff6b6b", "#ff9f5f", "#ffb38b", "#d96b6b", "#ff8f9d"],
  },
};

const MAPS = [
  {
    id: "iron-cross",
    name: "Iron Cross",
    description: "대칭 중앙 요새와 긴 복도.",
    decor: "grid",
    palette: {
      skyTop: "#183448",
      skyBottom: "#0b1821",
      grid: "rgba(217, 245, 255, 0.12)",
      border: "rgba(140, 204, 255, 0.22)",
      wallTop: "#294457",
      wallBottom: "#172b37",
      wallStroke: "rgba(234, 249, 255, 0.1)",
      decorA: "rgba(119, 214, 255, 0.08)",
      decorB: "rgba(255, 209, 102, 0.06)",
    },
    spawns: {
      player: { x: 210, y: WORLD.height / 2, angle: 0 },
      bot: { x: WORLD.width - 210, y: WORLD.height / 2, angle: Math.PI },
    },
    walls: [
      { x: 545, y: 180, w: 130, h: 180 },
      { x: 545, y: 540, w: 130, h: 180 },
      { x: 925, y: 180, w: 130, h: 180 },
      { x: 925, y: 540, w: 130, h: 180 },
      { x: 735, y: 340, w: 130, h: 220 },
      { x: 260, y: 160, w: 120, h: 48 },
      { x: 260, y: 692, w: 120, h: 48 },
      { x: 1220, y: 160, w: 120, h: 48 },
      { x: 1220, y: 692, w: 120, h: 48 },
    ],
    pickupPoints: [
      { x: 800, y: 140 },
      { x: 800, y: 760 },
      { x: 800, y: 450 },
      { x: 450, y: 450 },
      { x: 1150, y: 450 },
    ],
  },
  {
    id: "sandstorm",
    name: "Sandstorm Basin",
    description: "사구와 암석으로 끊긴 사막 분지.",
    decor: "dunes",
    palette: {
      skyTop: "#6f4c2c",
      skyBottom: "#2b1b13",
      grid: "rgba(255, 236, 184, 0.1)",
      border: "rgba(255, 206, 129, 0.25)",
      wallTop: "#8a6140",
      wallBottom: "#563827",
      wallStroke: "rgba(255, 243, 218, 0.1)",
      decorA: "rgba(255, 196, 96, 0.09)",
      decorB: "rgba(255, 241, 177, 0.06)",
    },
    spawns: {
      player: { x: 180, y: 220, angle: 0.18 },
      bot: { x: WORLD.width - 180, y: WORLD.height - 220, angle: Math.PI - 0.18 },
    },
    walls: [
      { x: 300, y: 180, w: 160, h: 90 },
      { x: 520, y: 420, w: 140, h: 260 },
      { x: 760, y: 120, w: 90, h: 220 },
      { x: 760, y: 560, w: 90, h: 220 },
      { x: 1010, y: 220, w: 170, h: 90 },
      { x: 1120, y: 500, w: 190, h: 120 },
      { x: 650, y: 390, w: 300, h: 120 },
    ],
    pickupPoints: [
      { x: 255, y: 690 },
      { x: 800, y: 450 },
      { x: 1330, y: 230 },
      { x: 540, y: 130 },
      { x: 1080, y: 760 },
    ],
  },
  {
    id: "glacier-run",
    name: "Glacier Run",
    description: "얼음 수로와 열린 저격 라인.",
    decor: "cracks",
    palette: {
      skyTop: "#6aa7c8",
      skyBottom: "#102331",
      grid: "rgba(239, 250, 255, 0.12)",
      border: "rgba(200, 239, 255, 0.28)",
      wallTop: "#7fb8d6",
      wallBottom: "#33536a",
      wallStroke: "rgba(255, 255, 255, 0.12)",
      decorA: "rgba(217, 245, 255, 0.12)",
      decorB: "rgba(126, 242, 255, 0.06)",
    },
    spawns: {
      player: { x: 170, y: WORLD.height / 2, angle: 0 },
      bot: { x: WORLD.width - 170, y: WORLD.height / 2, angle: Math.PI },
    },
    walls: [
      { x: 360, y: 128, w: 105, h: 640 },
      { x: 1135, y: 128, w: 105, h: 640 },
      { x: 610, y: 110, w: 380, h: 92 },
      { x: 610, y: 698, w: 380, h: 92 },
      { x: 710, y: 300, w: 180, h: 120 },
      { x: 710, y: 480, w: 180, h: 120 },
    ],
    pickupPoints: [
      { x: 530, y: 450 },
      { x: 1070, y: 450 },
      { x: 800, y: 250 },
      { x: 800, y: 650 },
      { x: 800, y: 450 },
    ],
  },
  {
    id: "neon-dock",
    name: "Neon Dockyard",
    description: "컨테이너 통로가 교차하는 야간 부두.",
    decor: "stripes",
    palette: {
      skyTop: "#13203d",
      skyBottom: "#081018",
      grid: "rgba(123, 255, 209, 0.09)",
      border: "rgba(93, 235, 188, 0.25)",
      wallTop: "#254867",
      wallBottom: "#102336",
      wallStroke: "rgba(182, 255, 234, 0.12)",
      decorA: "rgba(50, 224, 196, 0.08)",
      decorB: "rgba(255, 82, 119, 0.07)",
    },
    spawns: {
      player: { x: 220, y: 730, angle: -0.32 },
      bot: { x: WORLD.width - 220, y: 170, angle: Math.PI - 0.32 },
    },
    walls: [
      { x: 250, y: 420, w: 320, h: 88 },
      { x: 1030, y: 392, w: 320, h: 88 },
      { x: 650, y: 150, w: 100, h: 220 },
      { x: 850, y: 530, w: 100, h: 220 },
      { x: 620, y: 390, w: 360, h: 110 },
      { x: 450, y: 150, w: 110, h: 150 },
      { x: 1040, y: 600, w: 110, h: 150 },
    ],
    pickupPoints: [
      { x: 220, y: 200 },
      { x: 800, y: 120 },
      { x: 800, y: 780 },
      { x: 1380, y: 700 },
      { x: 800, y: 450 },
    ],
  },
  {
    id: "emerald-rift",
    name: "Emerald Rift",
    description: "초록 협곡과 단절된 중앙 교차로.",
    decor: "rings",
    palette: {
      skyTop: "#274032",
      skyBottom: "#0c1812",
      grid: "rgba(196, 255, 206, 0.08)",
      border: "rgba(142, 224, 160, 0.24)",
      wallTop: "#3e6c4f",
      wallBottom: "#1d3628",
      wallStroke: "rgba(226, 255, 234, 0.1)",
      decorA: "rgba(140, 255, 180, 0.09)",
      decorB: "rgba(255, 214, 112, 0.05)",
    },
    spawns: {
      player: { x: 200, y: 170, angle: 0.48 },
      bot: { x: WORLD.width - 200, y: WORLD.height - 170, angle: Math.PI + 0.48 },
    },
    walls: [
      { x: 330, y: 150, w: 120, h: 220 },
      { x: 330, y: 520, w: 120, h: 220 },
      { x: 1150, y: 150, w: 120, h: 220 },
      { x: 1150, y: 520, w: 120, h: 220 },
      { x: 610, y: 240, w: 120, h: 420 },
      { x: 870, y: 240, w: 120, h: 420 },
      { x: 730, y: 390, w: 140, h: 120 },
    ],
    pickupPoints: [
      { x: 210, y: 450 },
      { x: 800, y: 180 },
      { x: 800, y: 720 },
      { x: 1390, y: 450 },
      { x: 800, y: 450 },
    ],
  },
];

const PICKUP_TYPES = ["heal", "rapid", "shield"];

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  fire: false,
  mouseX: WORLD.width * 0.75,
  mouseY: WORLD.height / 2,
};

const state = {
  mode: "menu",
  mapIndex: 0,
  time: 0,
  round: 1,
  config: { ...DEFAULT_CONFIG },
  scoreTarget: getScoreTarget(DEFAULT_CONFIG),
  message: "",
  messageTimer: 0,
  buttons: [],
  hoveredButton: null,
  pickup: null,
  pickupTimer: 2.5,
  specialItems: [],
  hazards: [],
  bullets: [],
  neutralTank: null,
  particles: [],
  tanks: [],
  teams: createTeams(DEFAULT_CONFIG),
  botBrains: {},
  localPlayerId: null,
  winnerTeam: null,
};

let bulletIdCounter = 1;
let pickupIdCounter = 1;
let lastFrameTime = performance.now();
let rafId = 0;
let starAudioContext = null;
let starLoopGain = null;
let starLoopTimer = 0;

const audioState = {
  unlocked: false,
  bgm: null,
  effects: null,
};

function createAudioInstance(src, volume, loop = false) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = volume;
  audio.loop = loop;
  return audio;
}

function createAudioPool(src, volume, size = 5) {
  return {
    items: Array.from({ length: size }, () => createAudioInstance(src, volume, false)),
    cursor: 0,
  };
}

function ensureAudioSetup() {
  if (audioState.bgm) return;

  audioState.bgm = createAudioInstance("./sound/bgm/tank_battle_bgm.wav", 0.35, true);
  audioState.effects = {
    playerShot: createAudioPool("./sound/effects/player_shot.wav", 0.48, 6),
    enemyShot: createAudioPool("./sound/effects/enemy_shot.wav", 0.42, 10),
    powerShot: createAudioPool("./sound/effects/power_cannon_shot.wav", 0.52, 6),
    hit: createAudioPool("./sound/effects/tank_hit.wav", 0.44, 8),
    shieldPickup: createAudioPool("./sound/effects/shield_pickup.wav", 0.5, 3),
    healPickup: createAudioPool("./sound/effects/heal_pickup.wav", 0.48, 3),
    powerPickup: createAudioPool("./sound/effects/power_pickup.wav", 0.5, 3),
  };
}

function playFromPool(pool) {
  if (!pool) return;
  const audio = pool.items[pool.cursor];
  pool.cursor = (pool.cursor + 1) % pool.items.length;
  try {
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  } catch (_error) {}
}

function unlockAudio() {
  ensureAudioSetup();
  audioState.unlocked = true;
  syncBgmToState();
}

function syncBgmToState() {
  ensureAudioSetup();
  if (!audioState.unlocked || !audioState.bgm) return;

  const shouldPlay = state.mode === "playing" || state.mode === "paused" || state.mode === "finished";
  if (shouldPlay) {
    audioState.bgm.volume = state.mode === "paused" ? 0.2 : 0.35;
    const playPromise = audioState.bgm.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  } else {
    audioState.bgm.pause();
    audioState.bgm.currentTime = 0;
  }
}

function playShotAudio(owner) {
  if (!audioState.unlocked) return;
  const boosted = owner.rapidFireTimer > 0;
  if (boosted) {
    playFromPool(audioState.effects.powerShot);
    return;
  }
  if (owner.controlled) {
    playFromPool(audioState.effects.playerShot);
    return;
  }
  playFromPool(audioState.effects.enemyShot);
}

function playHitAudio() {
  if (!audioState.unlocked) return;
  playFromPool(audioState.effects.hit);
}

function playPickupAudio(type) {
  if (!audioState.unlocked) return;
  if (type === "shield") {
    playFromPool(audioState.effects.shieldPickup);
  } else if (type === "heal") {
    playFromPool(audioState.effects.healPickup);
  } else if (type === "rapid") {
    playFromPool(audioState.effects.powerPickup);
  }
}

function ensureStarAudio() {
  if (!starAudioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    starAudioContext = new Ctx();
  }
  if (starAudioContext.state === "suspended") {
    starAudioContext.resume().catch(() => {});
  }
  return starAudioContext;
}

function startStarLoop() {
  if (starLoopTimer) return;
  const ctx = ensureStarAudio();
  if (!ctx) return;
  starLoopGain = ctx.createGain();
  starLoopGain.gain.value = 0.045;
  starLoopGain.connect(ctx.destination);
  const notes = [784, 988, 1175, 1568, 1175, 988, 1319, 1760];
  let index = 0;
  starLoopTimer = window.setInterval(() => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = index % 3 === 0 ? "square" : "triangle";
    osc.frequency.setValueAtTime(notes[index % notes.length], now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.7, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain);
    gain.connect(starLoopGain);
    osc.start(now);
    osc.stop(now + 0.17);
    index += 1;
  }, 140);
}

function stopStarLoop() {
  if (starLoopTimer) {
    window.clearInterval(starLoopTimer);
    starLoopTimer = 0;
  }
  if (starLoopGain) {
    starLoopGain.disconnect();
    starLoopGain = null;
  }
}

function getCurrentMap() {
  return MAPS[state.mapIndex] || MAPS[0];
}

function getCurrentWalls() {
  return getCurrentMap().walls;
}

function getCurrentPickupPoints() {
  return getCurrentMap().pickupPoints;
}

function getNeutralTankSpawn(map) {
  switch (map.id) {
    case "iron-cross":
      return { x: 800, y: 130 };
    case "sandstorm":
      return { x: 1330, y: 690 };
    case "glacier-run":
      return { x: 800, y: 450 };
    case "neon-dock":
      return { x: 220, y: 710 };
    case "emerald-rift":
      return { x: 800, y: 760 };
    default:
      return { x: 800, y: 140 };
  }
}

function createNeutralTank(map) {
  const spawn = getNeutralTankSpawn(map);
  return {
    x: spawn.x,
    y: spawn.y,
    w: 76,
    h: 58,
    hp: NEUTRAL_TANK_HP,
    maxHp: NEUTRAL_TANK_HP,
    alive: true,
  };
}

function getNeutralTankRect(tank = state.neutralTank) {
  if (!tank || !tank.alive) return null;
  return {
    x: tank.x - tank.w / 2,
    y: tank.y - tank.h / 2,
    w: tank.w,
    h: tank.h,
  };
}

function getArenaObstacles() {
  const obstacles = [...getCurrentWalls()];
  const neutralRect = getNeutralTankRect();
  if (neutralRect) obstacles.push(neutralRect);
  return obstacles;
}

function getTankScale(tank) {
  return tank && tank.mushroomTimer > 0 ? MUSHROOM_SCALE : 1;
}

function getTankRadius(tank) {
  return tank.radius * getTankScale(tank);
}

function getTankSpeed(baseSpeed, tank) {
  return tank.starTimer > 0 ? baseSpeed * STAR_SPEED_MULTIPLIER : baseSpeed;
}

function getBulletScale(tank) {
  return tank.mushroomTimer > 0 ? MUSHROOM_BULLET_SCALE : 1;
}

function getRainbowColor(offset = 0) {
  return `hsl(${(state.time * 320 + offset) % 360} 92% 64%)`;
}

function isTankPlacementFree(x, y) {
  if (x < TANK_RADIUS || x > WORLD.width - TANK_RADIUS) return false;
  if (y < TANK_RADIUS || y > WORLD.height - TANK_RADIUS) return false;
  for (const wall of getCurrentWalls()) {
    if (circleRectCollides(x, y, TANK_RADIUS, wall)) {
      return false;
    }
  }
  return true;
}

function canTankTraverseBetween(x1, y1, x2, y2) {
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(distance / PICKUP_ACCESS_PROBE_STEP));
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const px = lerp(x1, x2, t);
    const py = lerp(y1, y2, t);
    if (!isTankPlacementFree(px, py)) {
      return false;
    }
  }
  return true;
}

function getPickupReachabilityOrigins() {
  const origins = [];
  const seen = new Set();

  const pushOrigin = (x, y) => {
    if (!isTankPlacementFree(x, y)) return;
    const key = `${Math.round(x)}:${Math.round(y)}`;
    if (seen.has(key)) return;
    seen.add(key);
    origins.push({ x, y });
  };

  for (const tank of state.tanks) {
    if (tank.alive) {
      pushOrigin(tank.x, tank.y);
    } else if (tank.spawn) {
      pushOrigin(tank.spawn.x, tank.spawn.y);
    }
  }

  if (origins.length > 0) {
    return origins;
  }

  const map = getCurrentMap();
  pushOrigin(map.spawns.player.x, map.spawns.player.y);
  pushOrigin(map.spawns.bot.x, map.spawns.bot.y);
  return origins;
}

function getPickupGridMetrics() {
  return {
    columns: Math.floor((WORLD.width - TANK_RADIUS * 2) / PICKUP_SEARCH_STEP) + 1,
    rows: Math.floor((WORLD.height - TANK_RADIUS * 2) / PICKUP_SEARCH_STEP) + 1,
  };
}

function getPickupGridCenter(column, row) {
  return {
    x: TANK_RADIUS + column * PICKUP_SEARCH_STEP,
    y: TANK_RADIUS + row * PICKUP_SEARCH_STEP,
  };
}

function clampPickupGridColumn(column, metrics) {
  return clamp(column, 0, metrics.columns - 1);
}

function clampPickupGridRow(row, metrics) {
  return clamp(row, 0, metrics.rows - 1);
}

function getPickupGridColumnForX(x, metrics) {
  return clampPickupGridColumn(Math.round((x - TANK_RADIUS) / PICKUP_SEARCH_STEP), metrics);
}

function getPickupGridRowForY(y, metrics) {
  return clampPickupGridRow(Math.round((y - TANK_RADIUS) / PICKUP_SEARCH_STEP), metrics);
}

function buildPickupReachabilityMap() {
  const metrics = getPickupGridMetrics();
  const walkable = Array.from({ length: metrics.rows }, () => Array(metrics.columns).fill(false));
  const reachable = Array.from({ length: metrics.rows }, () => Array(metrics.columns).fill(false));

  for (let row = 0; row < metrics.rows; row += 1) {
    for (let column = 0; column < metrics.columns; column += 1) {
      const point = getPickupGridCenter(column, row);
      walkable[row][column] = isTankPlacementFree(point.x, point.y);
    }
  }

  const queue = [];
  let queueIndex = 0;

  const enqueueCell = (column, row) => {
    if (!walkable[row]?.[column] || reachable[row][column]) return;
    reachable[row][column] = true;
    queue.push({ column, row });
  };

  const seedFromOrigin = (origin) => {
    const baseColumn = getPickupGridColumnForX(origin.x, metrics);
    const baseRow = getPickupGridRowForY(origin.y, metrics);

    for (let ring = 0; ring <= PICKUP_SEARCH_MAX_RINGS; ring += 1) {
      let seeded = false;

      for (let dColumn = -ring; dColumn <= ring; dColumn += 1) {
        for (let dRow = -ring; dRow <= ring; dRow += 1) {
          if (Math.abs(dColumn) !== ring && Math.abs(dRow) !== ring) continue;

          const column = clampPickupGridColumn(baseColumn + dColumn, metrics);
          const row = clampPickupGridRow(baseRow + dRow, metrics);
          if (!walkable[row][column]) continue;

          const point = getPickupGridCenter(column, row);
          if (!canTankTraverseBetween(origin.x, origin.y, point.x, point.y)) continue;

          enqueueCell(column, row);
          seeded = true;
        }
      }

      if (seeded) {
        return;
      }
    }
  };

  for (const origin of getPickupReachabilityOrigins()) {
    seedFromOrigin(origin);
  }

  const neighborOffsets = [
    { column: 1, row: 0 },
    { column: -1, row: 0 },
    { column: 0, row: 1 },
    { column: 0, row: -1 },
  ];

  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;
    const currentPoint = getPickupGridCenter(current.column, current.row);

    for (const offset of neighborOffsets) {
      const nextColumn = current.column + offset.column;
      const nextRow = current.row + offset.row;
      if (
        nextColumn < 0 ||
        nextColumn >= metrics.columns ||
        nextRow < 0 ||
        nextRow >= metrics.rows ||
        !walkable[nextRow][nextColumn] ||
        reachable[nextRow][nextColumn]
      ) {
        continue;
      }

      const nextPoint = getPickupGridCenter(nextColumn, nextRow);
      if (!canTankTraverseBetween(currentPoint.x, currentPoint.y, nextPoint.x, nextPoint.y)) {
        continue;
      }

      enqueueCell(nextColumn, nextRow);
    }
  }

  return { metrics, reachable };
}

function isPickupPointReachable(x, y, reachability) {
  if (!isTankPlacementFree(x, y)) {
    return false;
  }

  const baseColumn = getPickupGridColumnForX(x, reachability.metrics);
  const baseRow = getPickupGridRowForY(y, reachability.metrics);

  for (let ring = 0; ring <= 2; ring += 1) {
    for (let dColumn = -ring; dColumn <= ring; dColumn += 1) {
      for (let dRow = -ring; dRow <= ring; dRow += 1) {
        if (Math.abs(dColumn) !== ring && Math.abs(dRow) !== ring) continue;

        const column = clampPickupGridColumn(baseColumn + dColumn, reachability.metrics);
        const row = clampPickupGridRow(baseRow + dRow, reachability.metrics);
        if (!reachability.reachable[row][column]) continue;

        const point = getPickupGridCenter(column, row);
        if (canTankTraverseBetween(point.x, point.y, x, y)) {
          return true;
        }
      }
    }
  }

  return false;
}

function resolvePickupAnchor(anchor, reachability) {
  if (isPickupPointReachable(anchor.x, anchor.y, reachability)) {
    return { x: anchor.x, y: anchor.y };
  }

  for (let ring = 1; ring <= PICKUP_SEARCH_MAX_RINGS; ring += 1) {
    let best = null;
    let bestDistanceSq = Infinity;

    for (let dx = -ring; dx <= ring; dx += 1) {
      for (let dy = -ring; dy <= ring; dy += 1) {
        if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;

        const candidateX = anchor.x + dx * PICKUP_SEARCH_STEP;
        const candidateY = anchor.y + dy * PICKUP_SEARCH_STEP;
        if (!isPickupPointReachable(candidateX, candidateY, reachability)) continue;

        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < bestDistanceSq) {
          best = { x: candidateX, y: candidateY };
          bestDistanceSq = distanceSq;
        }
      }
    }

    if (best) {
      return best;
    }
  }

  return null;
}

function findFallbackPickupPoint(reachability) {
  for (let row = 0; row < reachability.metrics.rows; row += 1) {
    for (let column = 0; column < reachability.metrics.columns; column += 1) {
      if (reachability.reachable[row][column]) {
        return getPickupGridCenter(column, row);
      }
    }
  }
  return null;
}

function collectResolvedPickupPoints() {
  const reachability = buildPickupReachabilityMap();
  const resolvedPoints = [];
  const seen = new Set();

  for (const point of getCurrentPickupPoints()) {
    const resolved = resolvePickupAnchor(point, reachability);
    if (!resolved) continue;

    const key = `${resolved.x}:${resolved.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    resolvedPoints.push({
      anchorX: point.x,
      anchorY: point.y,
      x: resolved.x,
      y: resolved.y,
    });
  }

  if (resolvedPoints.length > 0) {
    return resolvedPoints;
  }

  const fallback = findFallbackPickupPoint(reachability);
  if (!fallback) return [];
  return [
    {
      anchorX: fallback.x,
      anchorY: fallback.y,
      x: fallback.x,
      y: fallback.y,
    },
  ];
}

function setMapIndex(index) {
  state.mapIndex = (index + MAPS.length) % MAPS.length;
}

function setInputIdle() {
  input.up = false;
  input.down = false;
  input.left = false;
  input.right = false;
  input.fire = false;
}

function togglePause() {
  if (state.mode === "playing") {
    state.mode = "paused";
    setInputIdle();
  } else if (state.mode === "paused") {
    state.mode = "playing";
  }
  syncBgmToState();
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function angleDiff(a, b) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function clampTeamSize(value) {
  return clamp(Math.round(value), MIN_TEAM_SIZE, MAX_TEAM_SIZE);
}

function normalizeConfig(patch = {}) {
  return {
    friendlyCount:
      typeof patch.friendlyCount === "number"
        ? clampTeamSize(patch.friendlyCount)
        : state.config.friendlyCount,
    enemyCount:
      typeof patch.enemyCount === "number" ? clampTeamSize(patch.enemyCount) : state.config.enemyCount,
  };
}

function getScoreTarget(config) {
  return Math.max(MIN_SCORE_TO_WIN, Math.max(config.friendlyCount, config.enemyCount) + 1);
}

function createTeams(config) {
  return {
    blue: {
      id: "blue",
      name: TEAM_META.blue.name,
      short: TEAM_META.blue.short,
      count: config.friendlyCount,
      score: 0,
    },
    red: {
      id: "red",
      name: TEAM_META.red.name,
      short: TEAM_META.red.short,
      count: config.enemyCount,
      score: 0,
    },
  };
}

function buildSpawnSlots(side, count) {
  const anchor = side === "left" ? getCurrentMap().spawns.player : getCurrentMap().spawns.bot;
  const direction = side === "left" ? 1 : -1;
  const slots = [
    {
      x: clamp(anchor.x, TANK_RADIUS, WORLD.width - TANK_RADIUS),
      y: clamp(anchor.y, TANK_RADIUS, WORLD.height - TANK_RADIUS),
      angle: anchor.angle,
    },
  ];

  for (let index = 1; index < count; index += 1) {
    const ring = Math.ceil(index / 2);
    const verticalSign = index % 2 === 1 ? -1 : 1;
    const yOffset = ring * 92 * verticalSign;
    const xOffset = 52 + (ring - 1) * 18;
    slots.push({
      x: clamp(anchor.x + direction * xOffset, TANK_RADIUS, WORLD.width - TANK_RADIUS),
      y: clamp(anchor.y + yOffset, TANK_RADIUS, WORLD.height - TANK_RADIUS),
      angle: anchor.angle,
    });
  }

  return slots;
}

function createBotBrain() {
  return {
    strafeDir: Math.random() > 0.5 ? 1 : -1,
    switchTimer: 0.7 + Math.random() * 0.8,
    burstCooldown: 0.18 + Math.random() * 0.28,
    retreatTimer: 0,
  };
}

function createTank({ id, label, teamId, spawn, controlled = false, variantIndex = 0 }) {
  const meta = TEAM_META[teamId];
  return {
    id,
    label,
    teamId,
    controlled,
    color: meta.colors[variantIndex % meta.colors.length],
    accent: meta.accent,
    bulletColor: meta.bullet,
    spawn,
    x: spawn.x,
    y: spawn.y,
    radius: TANK_RADIUS,
    bodyAngle: spawn.angle,
    turretAngle: spawn.angle,
    hp: MAX_HP,
    score: 0,
    deaths: 0,
    alive: true,
    respawnTimer: 0,
    fireCooldown: 0,
    rapidFireTimer: 0,
    starTimer: 0,
    mushroomTimer: 0,
    shield: false,
    flashTimer: 0,
    moveX: 0,
    moveY: 0,
    lastHitBy: null,
    speed: controlled ? PLAYER_SPEED : BOT_SPEED,
  };
}

function buildMatchState(config) {
  const tanks = [];
  const botBrains = {};
  let localPlayerId = null;

  const friendlySpawns = buildSpawnSlots(TEAM_META.blue.side, config.friendlyCount);
  friendlySpawns.forEach((spawn, index) => {
    const controlled = index === 0;
    const tank = createTank({
      id: controlled ? "player" : `ally-${index}`,
      label: controlled ? "YOU" : `ALLY ${index}`,
      teamId: "blue",
      spawn,
      controlled,
      variantIndex: index,
    });
    tanks.push(tank);
    if (controlled) {
      localPlayerId = tank.id;
    } else {
      botBrains[tank.id] = createBotBrain();
    }
  });

  const enemySpawns = buildSpawnSlots(TEAM_META.red.side, config.enemyCount);
  enemySpawns.forEach((spawn, index) => {
    const tank = createTank({
      id: index === 0 ? "bot" : `enemy-${index + 1}`,
      label: `ENEMY ${index + 1}`,
      teamId: "red",
      spawn,
      variantIndex: index,
    });
    tanks.push(tank);
    botBrains[tank.id] = createBotBrain();
  });

  return { tanks, botBrains, localPlayerId };
}

function getTankById(id) {
  return state.tanks.find((tank) => tank.id === id) || null;
}

function resolveTankIdentifier(id) {
  if (id === "player") return getLocalPlayer();
  if (id === "bot") return getLeadEnemy();
  return getTankById(id);
}

function getTeamTanks(teamId) {
  return state.tanks.filter((tank) => tank.teamId === teamId);
}

function getOpposingTanks(teamId) {
  return state.tanks.filter((tank) => tank.teamId !== teamId);
}

function getAliveTeamCount(teamId) {
  return getTeamTanks(teamId).filter((tank) => tank.alive).length;
}

function getLocalPlayer() {
  return state.localPlayerId ? getTankById(state.localPlayerId) : null;
}

function getLeadEnemy() {
  return state.tanks.find((tank) => tank.teamId === "red") || null;
}

function updateConfig(patch) {
  state.config = normalizeConfig(patch);
  state.scoreTarget = getScoreTarget(state.config);
  state.teams = createTeams(state.config);
}

function resetMatch() {
  const config = { ...state.config };
  const matchState = buildMatchState(config);
  setInputIdle();
  state.mode = "playing";
  state.time = 0;
  state.round = 1;
  state.scoreTarget = getScoreTarget(config);
  state.teams = createTeams(config);
  state.tanks = matchState.tanks;
  state.botBrains = matchState.botBrains;
  state.localPlayerId = matchState.localPlayerId;
  state.message = `${getCurrentMap().name} · ${config.friendlyCount} vs ${config.enemyCount}. First to ${state.scoreTarget} team kills wins.`;
  state.messageTimer = 2.6;
  state.buttons = [];
  state.hoveredButton = null;
  state.pickup = null;
  state.pickupTimer = 2.5;
  state.specialItems = [];
  state.hazards = [];
  state.bullets = [];
  state.neutralTank = createNeutralTank(getCurrentMap());
  state.particles = [];
  state.winnerTeam = null;
  stopStarLoop();
  syncBgmToState();
}

function restartToMenu() {
  setInputIdle();
  state.mode = "menu";
  state.time = 0;
  state.round = 1;
  state.scoreTarget = getScoreTarget(state.config);
  state.message = "";
  state.messageTimer = 0;
  state.buttons = [];
  state.hoveredButton = null;
  state.pickup = null;
  state.pickupTimer = 2.5;
  state.specialItems = [];
  state.hazards = [];
  state.bullets = [];
  state.neutralTank = createNeutralTank(getCurrentMap());
  state.particles = [];
  state.tanks = [];
  state.teams = createTeams(state.config);
  state.botBrains = {};
  state.localPlayerId = null;
  state.winnerTeam = null;
  stopStarLoop();
  syncBgmToState();
}

function startGame() {
  resetMatch();
}

function circleRectCollides(x, y, radius, rect) {
  const nearestX = clamp(x, rect.x, rect.x + rect.w);
  const nearestY = clamp(y, rect.y, rect.y + rect.h);
  const dx = x - nearestX;
  const dy = y - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

function lineBlocked(x1, y1, x2, y2) {
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(distance / 18));
  const walls = getArenaObstacles();
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const px = lerp(x1, x2, t);
    const py = lerp(y1, y2, t);
    for (const wall of walls) {
      if (px >= wall.x && px <= wall.x + wall.w && py >= wall.y && py <= wall.y + wall.h) {
        return true;
      }
    }
  }
  return false;
}

function resolveTankMovement(tank, moveX, moveY, speed, dt) {
  if (!tank.alive) return;
  const walls = getArenaObstacles();
  const radius = getTankRadius(tank);
  let nextX = tank.x + moveX * speed * dt;
  nextX = clamp(nextX, radius, WORLD.width - radius);
  let collidedX = false;
  for (const wall of walls) {
    if (circleRectCollides(nextX, tank.y, radius, wall)) {
      collidedX = true;
      break;
    }
  }
  if (!collidedX) {
    tank.x = nextX;
  }

  let nextY = tank.y + moveY * speed * dt;
  nextY = clamp(nextY, radius, WORLD.height - radius);
  let collidedY = false;
  for (const wall of walls) {
    if (circleRectCollides(tank.x, nextY, radius, wall)) {
      collidedY = true;
      break;
    }
  }
  if (!collidedY) {
    tank.y = nextY;
  }

  tank.moveX = moveX;
  tank.moveY = moveY;
  if (moveX || moveY) {
    tank.bodyAngle = Math.atan2(moveY, moveX);
  }
}

function nudgeTank(tank, dx, dy) {
  if (!tank.alive) return;
  const walls = getArenaObstacles();
  const radius = getTankRadius(tank);

  let nextX = clamp(tank.x + dx, radius, WORLD.width - radius);
  let collidedX = false;
  for (const wall of walls) {
    if (circleRectCollides(nextX, tank.y, radius, wall)) {
      collidedX = true;
      break;
    }
  }
  if (!collidedX) {
    tank.x = nextX;
  }

  let nextY = clamp(tank.y + dy, radius, WORLD.height - radius);
  let collidedY = false;
  for (const wall of walls) {
    if (circleRectCollides(tank.x, nextY, radius, wall)) {
      collidedY = true;
      break;
    }
  }
  if (!collidedY) {
    tank.y = nextY;
  }
}

function separateOverlappingTanks(iterations = 1) {
  for (let step = 0; step < iterations; step += 1) {
    for (let index = 0; index < state.tanks.length; index += 1) {
      const tankA = state.tanks[index];
      if (!tankA.alive) continue;

      for (let inner = index + 1; inner < state.tanks.length; inner += 1) {
        const tankB = state.tanks[inner];
        if (!tankB.alive) continue;

        const dx = tankB.x - tankA.x;
        const dy = tankB.y - tankA.y;
        const distSq = dx * dx + dy * dy;
        const minDist = getTankRadius(tankA) + getTankRadius(tankB) + 4;
        if (distSq >= minDist * minDist) continue;

        const dist = Math.max(0.001, Math.sqrt(distSq));
        let nx = dx / dist;
        let ny = dy / dist;
        if (!Number.isFinite(nx) || !Number.isFinite(ny)) {
          nx = index % 2 === 0 ? 1 : 0;
          ny = index % 2 === 0 ? 0 : 1;
        }
        const push = (minDist - dist) / 2;
        nudgeTank(tankA, -nx * push, -ny * push);
        nudgeTank(tankB, nx * push, ny * push);
      }
    }
  }
}

function spawnBullet(owner) {
  const radiusScale = getBulletScale(owner);
  const muzzleDistance = getTankRadius(owner) + 18;
  const angle = owner.turretAngle;
  state.bullets.push({
    id: bulletIdCounter++,
    ownerId: owner.id,
    teamId: owner.teamId,
    x: owner.x + Math.cos(angle) * muzzleDistance,
    y: owner.y + Math.sin(angle) * muzzleDistance,
    vx: Math.cos(angle) * BULLET_SPEED,
    vy: Math.sin(angle) * BULLET_SPEED,
    angle,
    life: BULLET_LIFETIME,
    radius: 6 * radiusScale,
    damage: BULLET_DAMAGE * (owner.mushroomTimer > 0 ? 1.2 : 1),
    color: owner.bulletColor,
  });
  owner.fireCooldown = owner.rapidFireTimer > 0 ? RAPID_FIRE_COOLDOWN : BASE_FIRE_COOLDOWN;
  addFlash(owner.x, owner.y, owner.color, 34, 0.16);
  playShotAudio(owner);
}

function finishMatch(teamId) {
  state.mode = "finished";
  state.winnerTeam = teamId;
  state.message = `${TEAM_META[teamId].name} wins the battle.`;
  state.messageTimer = 999;
  state.bullets = [];
  syncBgmToState();
}

function killTank(victim, attacker) {
  victim.alive = false;
  victim.respawnTimer = RESPAWN_TIME;
  victim.hp = 0;
  victim.shield = false;
  victim.deaths += 1;
  victim.lastHitBy = attacker ? attacker.id : null;
  state.round += 1;
  addBurst(victim.x, victim.y, victim.color, 68, 0.45);

  if (attacker) {
    attacker.score += 1;
    state.teams[attacker.teamId].score += 1;
    showMessage(`${TEAM_META[attacker.teamId].short} TEAM scores!`, 1.25);
    if (state.teams[attacker.teamId].score >= state.scoreTarget) {
      finishMatch(attacker.teamId);
    }
  } else {
    showMessage(`${victim.label} destroyed.`, 1.0);
  }
}

function respawnTank(tank) {
  tank.x = tank.spawn.x;
  tank.y = tank.spawn.y;
  tank.bodyAngle = tank.spawn.angle;
  tank.turretAngle = tank.spawn.angle;
  tank.hp = MAX_HP;
  tank.alive = true;
  tank.respawnTimer = 0;
  tank.fireCooldown = 0.35;
  tank.rapidFireTimer = 0;
  tank.starTimer = 0;
  tank.mushroomTimer = 0;
  tank.shield = false;
  tank.flashTimer = 0.18;
  if (tank.controlled) stopStarLoop();
}

function tryApplyDamage(target, attacker, damage) {
  if (!target.alive) return false;
  if (target.shield) {
    target.shield = false;
    target.flashTimer = 0.18;
    addFlash(target.x, target.y, "#a5f1ff", 52, 0.22);
    showMessage(`${target.label} shield cracked.`, 0.8);
    playHitAudio();
    return true;
  }
  target.hp = Math.max(0, target.hp - damage);
  target.flashTimer = 0.16;
  addFlash(target.x, target.y, "#ffffff", 28, 0.12);
  playHitAudio();
  if (target.hp <= 0) {
    killTank(target, attacker);
  }
  return true;
}

function spawnShell(x, y, velocity) {
  const angle = Math.random() * Math.PI * 2;
  const vx = velocity?.vx ?? Math.cos(angle) * SHELL_SPEED;
  const vy = velocity?.vy ?? Math.sin(angle) * SHELL_SPEED;
  state.hazards.push({
    type: "shell",
    x,
    y,
    radius: 18,
    vx,
    vy,
    life: SHELL_LIFETIME,
    touchCooldown: 0,
  });
  showMessage("Shell loose in the arena.", 1.2);
}

function spawnSpecialItem(type, x, y) {
  state.specialItems.push({
    id: pickupIdCounter++,
    type,
    x,
    y,
    radius: type === "mushroom" ? 24 : 20,
    life: 14,
  });
  showMessage(type === "star" ? "A star dropped." : "A mushroom dropped.", 1.2);
}

function breakNeutralTank() {
  if (!state.neutralTank || !state.neutralTank.alive) return;
  state.neutralTank.alive = false;
  addBurst(state.neutralTank.x, state.neutralTank.y, "#f5d9a2", 56, 0.32);
  const roll = Math.random();
  if (roll < 0.34) {
    spawnShell(state.neutralTank.x, state.neutralTank.y);
  } else if (roll < 0.67) {
    spawnSpecialItem("star", state.neutralTank.x, state.neutralTank.y);
  } else {
    spawnSpecialItem("mushroom", state.neutralTank.x, state.neutralTank.y);
  }
}

function applySpecialItem(tank, item) {
  if (item.type === "star") {
    tank.starTimer = STAR_DURATION;
    tank.flashTimer = 0.22;
    addFlash(tank.x, tank.y, "#fff69f", 54, 0.24);
    showMessage(`${tank.label} grabs a star rush.`, 1.2);
    if (tank.controlled) startStarLoop();
  } else if (item.type === "mushroom") {
    tank.mushroomTimer = MUSHROOM_DURATION;
    tank.flashTimer = 0.22;
    addFlash(tank.x, tank.y, "#ff665f", 54, 0.24);
    showMessage(`${tank.label} grows huge ammo.`, 1.2);
  }
}

function collectSpecialItems(tank) {
  if (!tank.alive) return;
  state.specialItems = state.specialItems.filter((item) => {
    const dx = tank.x - item.x;
    const dy = tank.y - item.y;
    const hitDistance = getTankRadius(tank) + item.radius;
    if (dx * dx + dy * dy <= hitDistance * hitDistance) {
      applySpecialItem(tank, item);
      return false;
    }
    return true;
  });
}

function updateSpecialItemTimers(dt) {
  state.specialItems = state.specialItems.filter((item) => {
    item.life -= dt;
    return item.life > 0;
  });
}

function maybeSpawnPickup(dt) {
  if (state.pickup || state.mode !== "playing") return;
  state.pickupTimer -= dt;
  if (state.pickupTimer > 0) return;

  const pickupPoints = collectResolvedPickupPoints();
  if (pickupPoints.length === 0) {
    state.pickupTimer = PICKUP_RESPAWN;
    return;
  }
  const point = pickupPoints[Math.floor(Math.random() * pickupPoints.length)];
  const type = PICKUP_TYPES[Math.floor(Math.random() * PICKUP_TYPES.length)];
  state.pickup = {
    id: pickupIdCounter++,
    type,
    x: point.x,
    y: point.y,
    radius: PICKUP_RADIUS,
  };
}

function applyPickup(tank, pickup) {
  if (pickup.type === "heal") {
    tank.hp = Math.min(MAX_HP, tank.hp + 42);
    showMessage(`${tank.label} repairs armor.`, 1.0);
    addFlash(tank.x, tank.y, "#8cffae", 46, 0.24);
  } else if (pickup.type === "rapid") {
    tank.rapidFireTimer = POWERUP_DURATION;
    showMessage(`${tank.label} loads heavy shells.`, 1.0);
    addFlash(tank.x, tank.y, "#ffd166", 48, 0.24);
  } else if (pickup.type === "shield") {
    tank.shield = true;
    showMessage(`${tank.label} activates a shield.`, 1.0);
    addFlash(tank.x, tank.y, "#7ef2ff", 48, 0.24);
  }
  playPickupAudio(pickup.type);
  state.pickup = null;
  state.pickupTimer = PICKUP_RESPAWN;
}

function addFlash(x, y, color, size, life) {
  state.particles.push({
    type: "flash",
    x,
    y,
    size,
    life,
    maxLife: life,
    color,
  });
}

function addBurst(x, y, color, size, life) {
  state.particles.push({
    type: "burst",
    x,
    y,
    size,
    life,
    maxLife: life,
    color,
  });
}

function showMessage(text, duration) {
  state.message = text;
  state.messageTimer = duration;
}

function updateParticles(dt) {
  state.particles = state.particles.filter((particle) => {
    particle.life -= dt;
    return particle.life > 0;
  });
}

function updateHazards(dt) {
  const obstacles = getArenaObstacles();
  state.hazards = state.hazards.filter((hazard) => {
    hazard.life -= dt;
    hazard.touchCooldown = Math.max(0, hazard.touchCooldown - dt);
    if (hazard.life <= 0) return false;

    let nextX = hazard.x + hazard.vx * dt;
    let nextY = hazard.y + hazard.vy * dt;

    if (nextX < hazard.radius || nextX > WORLD.width - hazard.radius) {
      hazard.vx *= -1;
      nextX = clamp(nextX, hazard.radius, WORLD.width - hazard.radius);
    }
    if (nextY < hazard.radius || nextY > WORLD.height - hazard.radius) {
      hazard.vy *= -1;
      nextY = clamp(nextY, hazard.radius, WORLD.height - hazard.radius);
    }

    let bouncedX = false;
    let bouncedY = false;
    for (const obstacle of obstacles) {
      if (circleRectCollides(nextX, hazard.y, hazard.radius, obstacle)) bouncedX = true;
      if (circleRectCollides(hazard.x, nextY, hazard.radius, obstacle)) bouncedY = true;
    }
    if (bouncedX) {
      hazard.vx *= -1;
      nextX = hazard.x;
    }
    if (bouncedY) {
      hazard.vy *= -1;
      nextY = hazard.y;
    }

    hazard.x = nextX;
    hazard.y = nextY;

    if (hazard.touchCooldown <= 0) {
      for (const target of state.tanks) {
        if (!target.alive) continue;
        const dx = hazard.x - target.x;
        const dy = hazard.y - target.y;
        const hitDistance = hazard.radius + getTankRadius(target);
        if (dx * dx + dy * dy <= hitDistance * hitDistance) {
          const opponents = getOpposingTanks(target.teamId);
          const attacker = opponents.find((tank) => tank.alive) || null;
          tryApplyDamage(target, attacker, SHELL_DAMAGE);
          hazard.touchCooldown = 0.45;
          const angle = Math.atan2(dy || 1, dx || 1);
          hazard.vx = Math.cos(angle) * SHELL_SPEED;
          hazard.vy = Math.sin(angle) * SHELL_SPEED;
          break;
        }
      }
    }
    return true;
  });
}

function updateBullets(dt) {
  const nextBullets = [];
  const walls = getArenaObstacles();
  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    if (
      bullet.life <= 0 ||
      bullet.x < -20 ||
      bullet.x > WORLD.width + 20 ||
      bullet.y < -20 ||
      bullet.y > WORLD.height + 20
    ) {
      continue;
    }

    let destroyed = false;
    for (const wall of walls) {
      if (
        bullet.x >= wall.x &&
        bullet.x <= wall.x + wall.w &&
        bullet.y >= wall.y &&
        bullet.y <= wall.y + wall.h
      ) {
        addFlash(bullet.x, bullet.y, "#ffe2b5", 24, 0.16);
        destroyed = true;
        break;
      }
    }
    if (destroyed) continue;

    if (state.neutralTank && state.neutralTank.alive) {
      const rect = getNeutralTankRect();
      if (rect && circleRectCollides(bullet.x, bullet.y, bullet.radius, rect)) {
        state.neutralTank.hp = Math.max(0, state.neutralTank.hp - bullet.damage);
        addFlash(bullet.x, bullet.y, "#f6d9ae", 24, 0.16);
        if (state.neutralTank.hp <= 0) {
          breakNeutralTank();
        }
        continue;
      }
    }

    let target = null;
    let targetDistSq = Infinity;
    for (const tank of state.tanks) {
      if (!tank.alive || tank.teamId === bullet.teamId) continue;
      const dx = bullet.x - tank.x;
      const dy = bullet.y - tank.y;
      const hitDistance = getTankRadius(tank) + bullet.radius;
      const distSq = dx * dx + dy * dy;
      if (distSq <= hitDistance * hitDistance && distSq < targetDistSq) {
        target = tank;
        targetDistSq = distSq;
      }
    }

    if (target) {
      const attacker = getTankById(bullet.ownerId);
      if (attacker) {
        tryApplyDamage(target, attacker, bullet.damage);
      }
      destroyed = true;
    }

    if (state.mode === "finished") {
      break;
    }

    if (!destroyed) nextBullets.push(bullet);
  }
  state.bullets = state.mode === "finished" ? [] : nextBullets;
}

function updateTankStatus(tank, dt) {
  if (tank.fireCooldown > 0) tank.fireCooldown = Math.max(0, tank.fireCooldown - dt);
  if (tank.rapidFireTimer > 0) tank.rapidFireTimer = Math.max(0, tank.rapidFireTimer - dt);
  if (tank.starTimer > 0) tank.starTimer = Math.max(0, tank.starTimer - dt);
  if (tank.mushroomTimer > 0) tank.mushroomTimer = Math.max(0, tank.mushroomTimer - dt);
  if (tank.flashTimer > 0) tank.flashTimer = Math.max(0, tank.flashTimer - dt);
  if (tank.controlled && tank.starTimer <= 0) stopStarLoop();
  if (!tank.alive) {
    tank.respawnTimer -= dt;
    if (tank.respawnTimer <= 0 && state.mode === "playing") {
      respawnTank(tank);
    }
  }
}

function updatePlayer(dt) {
  const tank = getLocalPlayer();
  if (!tank || !tank.alive) return;

  let moveX = 0;
  let moveY = 0;
  if (input.left) moveX -= 1;
  if (input.right) moveX += 1;
  if (input.up) moveY -= 1;
  if (input.down) moveY += 1;

  if (moveX || moveY) {
    const magnitude = Math.hypot(moveX, moveY) || 1;
    moveX /= magnitude;
    moveY /= magnitude;
  }

  tank.turretAngle = Math.atan2(input.mouseY - tank.y, input.mouseX - tank.x);
  resolveTankMovement(tank, moveX, moveY, getTankSpeed(tank.speed, tank), dt);

  if (input.fire && tank.fireCooldown <= 0) {
    spawnBullet(tank);
  }

  if (state.pickup) {
    const dx = tank.x - state.pickup.x;
    const dy = tank.y - state.pickup.y;
    if (dx * dx + dy * dy <= (getTankRadius(tank) + state.pickup.radius) ** 2) {
      applyPickup(tank, state.pickup);
    }
  }
  collectSpecialItems(tank);
}

function shouldBotChasePickup(tank, pickup) {
  if (!pickup) return false;
  return (
    (pickup.type === "heal" && tank.hp < 58) ||
    (pickup.type === "shield" && !tank.shield) ||
    (pickup.type === "rapid" && tank.rapidFireTimer < 1)
  );
}

function chooseCombatTarget(tank) {
  const player = getLocalPlayer();
  const enemies = getOpposingTanks(tank.teamId).filter((enemy) => enemy.alive);
  let bestTarget = null;
  let bestScore = Infinity;

  for (const enemy of enemies) {
    let score = Math.hypot(enemy.x - tank.x, enemy.y - tank.y);
    if (player && enemy.id === player.id && tank.teamId !== player.teamId) {
      score *= 0.82;
    }
    if (!lineBlocked(tank.x, tank.y, enemy.x, enemy.y)) {
      score -= 45;
    }
    if (enemy.shield) {
      score += 28;
    }
    if (score < bestScore) {
      bestScore = score;
      bestTarget = enemy;
    }
  }

  return bestTarget;
}

function updateBot(tank, dt) {
  if (!tank.alive) return;

  const brain = state.botBrains[tank.id] || createBotBrain();
  state.botBrains[tank.id] = brain;
  brain.switchTimer -= dt;
  brain.burstCooldown = Math.max(0, brain.burstCooldown - dt);
  brain.retreatTimer = Math.max(0, brain.retreatTimer - dt);

  if (brain.switchTimer <= 0) {
    brain.switchTimer = 0.75 + Math.random() * 0.8;
    brain.strafeDir *= Math.random() > 0.3 ? -1 : 1;
  }

  const target = chooseCombatTarget(tank);
  if (!target) return;

  const toTargetX = target.x - tank.x;
  const toTargetY = target.y - tank.y;
  const distanceToTarget = Math.hypot(toTargetX, toTargetY) || 1;
  const aimAngle = Math.atan2(toTargetY, toTargetX);
  tank.turretAngle = aimAngle;

  let moveTargetX = target.x;
  let moveTargetY = target.y;
  let desiredDistance = 340;

  const specialTarget = state.specialItems[0];
  if (specialTarget) {
    moveTargetX = specialTarget.x;
    moveTargetY = specialTarget.y;
    desiredDistance = 18;
  }

  if (state.pickup && shouldBotChasePickup(tank, state.pickup)) {
    moveTargetX = state.pickup.x;
    moveTargetY = state.pickup.y;
    desiredDistance = 14;
  }

  if (distanceToTarget < 220 && !tank.shield) {
    brain.retreatTimer = 0.5;
  }

  let moveX = 0;
  let moveY = 0;

  if (brain.retreatTimer > 0) {
    moveX = -toTargetX / distanceToTarget;
    moveY = -toTargetY / distanceToTarget;
  } else {
    const toMoveTargetX = moveTargetX - tank.x;
    const toMoveTargetY = moveTargetY - tank.y;
    const distanceToMoveTarget = Math.hypot(toMoveTargetX, toMoveTargetY) || 1;
    if (distanceToMoveTarget > desiredDistance + 24) {
      moveX = toMoveTargetX / distanceToMoveTarget;
      moveY = toMoveTargetY / distanceToMoveTarget;
    } else if (distanceToTarget < desiredDistance - 40) {
      moveX = -toTargetX / distanceToTarget;
      moveY = -toTargetY / distanceToTarget;
    }

    moveX += (-toTargetY / distanceToTarget) * 0.75 * brain.strafeDir;
    moveY += (toTargetX / distanceToTarget) * 0.75 * brain.strafeDir;
  }

  if (moveX || moveY) {
    const magnitude = Math.hypot(moveX, moveY) || 1;
    moveX /= magnitude;
    moveY /= magnitude;
  }

  const probeX = tank.x + moveX * 36;
  const probeY = tank.y + moveY * 36;
  let blocked = false;
  for (const wall of getArenaObstacles()) {
    if (circleRectCollides(probeX, probeY, getTankRadius(tank), wall)) {
      blocked = true;
      break;
    }
  }
  if (blocked) {
    const swapX = -moveY * brain.strafeDir;
    const swapY = moveX * brain.strafeDir;
    moveX = swapX;
    moveY = swapY;
  }

  resolveTankMovement(tank, moveX, moveY, getTankSpeed(tank.speed, tank), dt);

  if (state.pickup) {
    const dx = tank.x - state.pickup.x;
    const dy = tank.y - state.pickup.y;
    if (dx * dx + dy * dy <= (getTankRadius(tank) + state.pickup.radius) ** 2) {
      applyPickup(tank, state.pickup);
    }
  }
  collectSpecialItems(tank);

  const hasSight = !lineBlocked(tank.x, tank.y, target.x, target.y);
  const angleError = Math.abs(angleDiff(tank.turretAngle, aimAngle));
  const wantsToShoot =
    hasSight &&
    distanceToTarget < 700 &&
    angleError < 0.24 &&
    (distanceToTarget < 440 || brain.burstCooldown <= 0);

  if (wantsToShoot && tank.fireCooldown <= 0) {
    spawnBullet(tank);
    brain.burstCooldown = 0.14 + Math.random() * 0.35;
  }
}

function updateGameplay(dt) {
  for (const tank of state.tanks) {
    updateTankStatus(tank, dt);
  }

  if (!state.tanks.length) return;
  if (state.mode === "paused") return;
  if (state.mode !== "playing") {
    updateBullets(dt);
    return;
  }

  updatePlayer(dt);
  for (const tank of state.tanks) {
    if (!tank.controlled) {
      updateBot(tank, dt);
    }
  }
  separateOverlappingTanks(2);
  updateBullets(dt);
  updateHazards(dt);
  updateSpecialItemTimers(dt);
  maybeSpawnPickup(dt);
}

function update(dt) {
  state.time += dt;
  if (state.messageTimer > 0 && state.messageTimer < 900) {
    state.messageTimer = Math.max(0, state.messageTimer - dt);
    if (state.messageTimer === 0) state.message = "";
  }
  updateParticles(dt);
  updateGameplay(dt);
}

function fitCanvasRect() {
  const rect = canvas.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    scaleX: canvas.width / rect.width,
    scaleY: canvas.height / rect.height,
  };
}

function screenToCanvas(clientX, clientY) {
  const rect = fitCanvasRect();
  return {
    x: (clientX - rect.left) * rect.scaleX,
    y: (clientY - rect.top) * rect.scaleY,
  };
}

function updateMousePosition(event) {
  const point = screenToCanvas(event.clientX, event.clientY);
  input.mouseX = clamp(point.x, 0, WORLD.width);
  input.mouseY = clamp(point.y, 0, WORLD.height);
}

function handleButtonPress(id) {
  unlockAudio();
  if (id === "start" || id === "restart") {
    startGame();
    return;
  }
  if (id === "menu") {
    restartToMenu();
    return;
  }
  if (id === "pause" || id === "resume") {
    togglePause();
    return;
  }
  if (id === "prev-map") {
    setMapIndex(state.mapIndex - 1);
    restartToMenu();
    return;
  }
  if (id === "next-map") {
    setMapIndex(state.mapIndex + 1);
    restartToMenu();
    return;
  }
  if (id === "dec-friendly") {
    updateConfig({ friendlyCount: state.config.friendlyCount - 1 });
    return;
  }
  if (id === "inc-friendly") {
    updateConfig({ friendlyCount: state.config.friendlyCount + 1 });
    return;
  }
  if (id === "dec-enemy") {
    updateConfig({ enemyCount: state.config.enemyCount - 1 });
    return;
  }
  if (id === "inc-enemy") {
    updateConfig({ enemyCount: state.config.enemyCount + 1 });
  }
}

function pickButtonAt(x, y) {
  return state.buttons.find(
    (button) => x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h
  );
}

function roundRect(context, x, y, w, h, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
}

function drawButton(button, label, options = {}) {
  const hovered = state.hoveredButton === button.id;
  const fontSize = options.fontSize || 34;
  const radius = options.radius || 18;
  ctx.save();
  ctx.fillStyle = hovered ? "rgba(255, 194, 96, 0.95)" : "rgba(12, 34, 47, 0.84)";
  ctx.strokeStyle = hovered ? "rgba(255, 240, 198, 0.95)" : "rgba(169, 216, 255, 0.25)";
  ctx.lineWidth = 2;
  roundRect(ctx, button.x, button.y, button.w, button.h, radius);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = hovered ? "#132631" : "#edf7ff";
  ctx.font = `600 ${fontSize}px Trebuchet MS`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, button.x + button.w / 2, button.y + button.h / 2 + 2);
  ctx.restore();
}

function drawArena() {
  const map = getCurrentMap();
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  gradient.addColorStop(0, map.palette.skyTop);
  gradient.addColorStop(1, map.palette.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  if (map.decor === "dunes") {
    ctx.save();
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? map.palette.decorA : map.palette.decorB;
      ctx.beginPath();
      ctx.ellipse(220 + i * 310, 160 + (i % 2) * 250, 280, 110, -0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (map.decor === "cracks") {
    ctx.save();
    ctx.strokeStyle = map.palette.decorA;
    ctx.lineWidth = 5;
    for (let x = 180; x < WORLD.width; x += 260) {
      ctx.beginPath();
      ctx.moveTo(x, 90);
      ctx.lineTo(x + 38, 220);
      ctx.lineTo(x - 14, 360);
      ctx.lineTo(x + 42, 520);
      ctx.lineTo(x, 760);
      ctx.stroke();
    }
    ctx.restore();
  } else if (map.decor === "stripes") {
    ctx.save();
    for (let x = -120; x < WORLD.width + 140; x += 180) {
      ctx.fillStyle = x % 360 === 0 ? map.palette.decorA : map.palette.decorB;
      ctx.fillRect(x, 0, 90, WORLD.height);
    }
    ctx.restore();
  } else if (map.decor === "rings") {
    ctx.save();
    ctx.strokeStyle = map.palette.decorA;
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(260, 220, 110, 0, Math.PI * 2);
    ctx.arc(1340, 680, 120, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = map.palette.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.height);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD.height; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = map.palette.border;
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, WORLD.width - 32, WORLD.height - 32);

  for (const wall of map.walls) {
    const wallGradient = ctx.createLinearGradient(wall.x, wall.y, wall.x, wall.y + wall.h);
    wallGradient.addColorStop(0, map.palette.wallTop);
    wallGradient.addColorStop(1, map.palette.wallBottom);
    ctx.fillStyle = wallGradient;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.strokeStyle = map.palette.wallStroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(wall.x + 1, wall.y + 1, wall.w - 2, wall.h - 2);
  }
}

function drawPickup(pickup) {
  if (!pickup) return;
  const palette = {
    heal: { fill: "#8cffae", label: "+" },
    rapid: { fill: "#ffd166", label: "R" },
    shield: { fill: "#7ef2ff", label: "S" },
  };
  const style = palette[pickup.type];
  ctx.save();
  ctx.translate(pickup.x, pickup.y);
  ctx.fillStyle = style.fill;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, pickup.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#09202c";
  ctx.font = "700 28px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(style.label, 0, 2);
  ctx.restore();
}

function drawNeutralTank() {
  if (!state.neutralTank || !state.neutralTank.alive) return;
  const tank = state.neutralTank;
  const map = getCurrentMap();
  ctx.save();
  ctx.translate(tank.x, tank.y);
  const bodyGradient = ctx.createLinearGradient(-tank.w / 2, -tank.h / 2, tank.w / 2, tank.h / 2);
  bodyGradient.addColorStop(0, map.palette.wallTop);
  bodyGradient.addColorStop(1, map.palette.wallBottom);
  ctx.fillStyle = bodyGradient;
  ctx.strokeStyle = map.palette.wallStroke;
  ctx.lineWidth = 3;
  roundRect(ctx, -tank.w / 2, -tank.h / 2, tank.w, tank.h, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, -18, -18, 36, 36, 10);
  ctx.fill();
  ctx.fillStyle = map.palette.wallStroke;
  roundRect(ctx, -8, -10, 40, 20, 10);
  ctx.fill();
  ctx.fillStyle = "#182f39";
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(7, 19, 29, 0.64)";
  roundRect(ctx, tank.x - 44, tank.y - 54, 88, 10, 5);
  ctx.fill();
  ctx.fillStyle = "#f0c27b";
  roundRect(ctx, tank.x - 44, tank.y - 54, 88 * (tank.hp / tank.maxHp), 10, 5);
  ctx.fill();
  ctx.restore();
}

function drawSpecialItems() {
  for (const item of state.specialItems) {
    ctx.save();
    ctx.translate(item.x, item.y);
    if (item.type === "star") {
      ctx.fillStyle = "#fff06a";
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const outer = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        const inner = outer + Math.PI / 5;
        const outerR = item.radius;
        const innerR = item.radius * 0.45;
        if (i === 0) ctx.moveTo(Math.cos(outer) * outerR, Math.sin(outer) * outerR);
        ctx.lineTo(Math.cos(inner) * innerR, Math.sin(inner) * innerR);
        ctx.lineTo(Math.cos(outer + (Math.PI * 2) / 5) * outerR, Math.sin(outer + (Math.PI * 2) / 5) * outerR);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = "#ff6b63";
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 3;
      roundRect(ctx, -item.radius * 0.8, -4, item.radius * 1.6, item.radius * 0.95, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffe6db";
      ctx.beginPath();
      ctx.arc(0, -item.radius * 0.18, item.radius * 0.82, Math.PI, 0, false);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-7, -8, 4, 0, Math.PI * 2);
      ctx.arc(7, -10, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawHazards() {
  for (const hazard of state.hazards) {
    ctx.save();
    ctx.translate(hazard.x, hazard.y);
    ctx.rotate(Math.atan2(hazard.vy, hazard.vx));
    ctx.fillStyle = "#6adf67";
    ctx.strokeStyle = "#efffe2";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, hazard.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e8f6d1";
    roundRect(ctx, -hazard.radius * 0.55, -hazard.radius * 0.2, hazard.radius * 1.1, hazard.radius * 0.4, 5);
    ctx.fill();
    ctx.restore();
  }
}

function drawTank(tank) {
  const bodyScale = tank.alive ? 1 : 0.85;
  const flash = tank.flashTimer > 0 ? 0.45 + Math.sin(state.time * 40) * 0.2 : 0;
  const tankScale = getTankScale(tank) * bodyScale;
  const bodyColor = tank.starTimer > 0 ? getRainbowColor(tank.controlled ? 0 : 180) : tank.color;
  const accentColor = tank.starTimer > 0 ? getRainbowColor(tank.controlled ? 120 : 300) : tank.accent;
  ctx.save();
  ctx.translate(tank.x, tank.y);

  if (tank.controlled && tank.alive) {
    ctx.strokeStyle = "rgba(255, 232, 177, 0.75)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, getTankRadius(tank) + 14, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (tank.shield && tank.alive) {
    ctx.strokeStyle = "rgba(126, 242, 255, 0.88)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, getTankRadius(tank) + 9 + Math.sin(state.time * 5) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.rotate(tank.bodyAngle);
  ctx.scale(tankScale, tankScale);
  ctx.fillStyle = tank.alive ? bodyColor : "rgba(128, 144, 158, 0.46)";
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  roundRect(ctx, -32, -24, 64, 48, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = `rgba(255,255,255,${0.1 + flash})`;
  roundRect(ctx, -18, -18, 36, 36, 10);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(tank.x, tank.y);
  ctx.rotate(tank.turretAngle);
  ctx.scale(getTankScale(tank), getTankScale(tank));
  ctx.fillStyle = accentColor;
  roundRect(ctx, -10, -10, 44, 20, 10);
  ctx.fill();
  ctx.fillStyle = "#182f39";
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(7, 19, 29, 0.64)";
  roundRect(ctx, tank.x - 44, tank.y - 52, 88, 10, 5);
  ctx.fill();
  ctx.fillStyle = tank.starTimer > 0 ? getRainbowColor(tank.controlled ? 40 : 220) : tank.color;
  roundRect(ctx, tank.x - 44, tank.y - 52, 88 * (tank.hp / MAX_HP), 10, 5);
  ctx.fill();
  ctx.fillStyle = "#f2f8fb";
  ctx.font = "600 16px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(tank.label, tank.x, tank.y + 56);
  ctx.restore();
}

function drawBullets() {
  for (const bullet of state.bullets) {
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(bullet.angle);
    ctx.fillStyle = bullet.color;
    roundRect(ctx, -bullet.radius * 1.25, -bullet.radius * 0.55, bullet.radius * 2.5, bullet.radius * 1.1, bullet.radius * 0.55);
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles() {
  for (const particle of state.particles) {
    const t = particle.life / particle.maxLife;
    ctx.save();
    ctx.globalAlpha = clamp(t, 0, 1);
    if (particle.type === "flash") {
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * (1 - t * 0.45), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = particle.color;
      ctx.lineWidth = 8 * t;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * (1 - t * 0.2), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawHudPanel(x, y, w, h) {
  ctx.save();
  ctx.fillStyle = "rgba(7, 19, 29, 0.78)";
  ctx.strokeStyle = "rgba(169, 216, 255, 0.2)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 20);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawMenuSelector(x, y, title, subtitle, count, decId, incId, tint) {
  drawHudPanel(x, y, 300, 200);

  ctx.textAlign = "center";
  ctx.fillStyle = tint;
  ctx.font = "700 30px Trebuchet MS";
  ctx.fillText(title, x + 150, y + 44);

  ctx.fillStyle = "#98b5c7";
  ctx.font = "500 18px Trebuchet MS";
  ctx.fillText(subtitle, x + 150, y + 74);

  ctx.fillStyle = "#edf7ff";
  ctx.font = "700 66px Trebuchet MS";
  ctx.fillText(String(count), x + 150, y + 136);

  ctx.fillStyle = "#98b5c7";
  ctx.font = "500 18px Trebuchet MS";
  ctx.fillText(`1 - ${MAX_TEAM_SIZE} tanks`, x + 150, y + 176);

  const decButton = { id: decId, x: x + 24, y: y + 92, w: 64, h: 64 };
  const incButton = { id: incId, x: x + 212, y: y + 92, w: 64, h: 64 };
  state.buttons.push(decButton, incButton);
  drawButton(decButton, "-", { fontSize: 44, radius: 16 });
  drawButton(incButton, "+", { fontSize: 44, radius: 16 });
}

function drawMapSelector(x, y, map) {
  drawHudPanel(x, y, 860, 160);

  ctx.textAlign = "center";
  ctx.fillStyle = "#edf7ff";
  ctx.font = "700 28px Trebuchet MS";
  ctx.fillText(`Map ${state.mapIndex + 1} / ${MAPS.length}  ${map.name}`, x + 430, y + 42);

  ctx.fillStyle = "#ffecb8";
  ctx.font = "500 22px Trebuchet MS";
  ctx.fillText(map.description, x + 430, y + 76);

  ctx.fillStyle = "#98b5c7";
  ctx.font = "500 20px Trebuchet MS";
  ctx.fillText("Choose a battlefield, then set your team sizes.", x + 430, y + 114);
  ctx.fillText("Move: WASD / Arrows   Shoot: Mouse / Space   Pause: P / Esc", x + 430, y + 140);

  const prevButton = { id: "prev-map", x: x + 28, y: y + 54, w: 72, h: 52 };
  const nextButton = { id: "next-map", x: x + 760, y: y + 54, w: 72, h: 52 };
  state.buttons.push(prevButton, nextButton);
  drawButton(prevButton, "←", { fontSize: 34, radius: 16 });
  drawButton(nextButton, "→", { fontSize: 34, radius: 16 });
}

function drawHud() {
  const map = getCurrentMap();
  const player = getLocalPlayer();
  const blueAlive = getAliveTeamCount("blue");
  const redAlive = getAliveTeamCount("red");

  drawHudPanel(22, 20, 350, 118);
  drawHudPanel(WORLD.width - 372, 20, 350, 118);
  drawHudPanel(460, 20, 680, 118);

  ctx.textAlign = "left";
  ctx.fillStyle = "#edf7ff";
  ctx.font = "700 26px Trebuchet MS";
  ctx.fillText("BLUE TEAM", 48, 56);
  ctx.font = "600 18px Trebuchet MS";
  ctx.fillStyle = "#98b5c7";
  ctx.fillText(`Alive ${blueAlive} / ${state.teams.blue.count}`, 48, 84);
  ctx.fillText(`Score ${state.teams.blue.score} / ${state.scoreTarget}`, 48, 108);

  ctx.textAlign = "right";
  ctx.fillStyle = "#edf7ff";
  ctx.font = "700 26px Trebuchet MS";
  ctx.fillText("RED TEAM", WORLD.width - 48, 56);
  ctx.font = "600 18px Trebuchet MS";
  ctx.fillStyle = "#98b5c7";
  ctx.fillText(`Alive ${redAlive} / ${state.teams.red.count}`, WORLD.width - 48, 84);
  ctx.fillText(`Score ${state.teams.red.score} / ${state.scoreTarget}`, WORLD.width - 48, 108);

  ctx.textAlign = "center";
  ctx.fillStyle = "#edf7ff";
  ctx.font = "700 24px Trebuchet MS";
  ctx.fillText(`Match ${state.config.friendlyCount} vs ${state.config.enemyCount}   Round ${state.round}`, WORLD.width / 2, 48);
  ctx.font = "600 18px Trebuchet MS";
  ctx.fillStyle = "#98b5c7";
  ctx.fillText(`Map ${state.mapIndex + 1}/${MAPS.length}  ${map.name}`, WORLD.width / 2, 74);

  const powerups = player
    ? [
        player.shield ? "Shield" : null,
        player.rapidFireTimer > 0 ? `Heavy Shell ${player.rapidFireTimer.toFixed(1)}s` : null,
        player.starTimer > 0 ? `Star ${player.starTimer.toFixed(1)}s` : null,
        player.mushroomTimer > 0 ? `Mushroom ${player.mushroomTimer.toFixed(1)}s` : null,
        player.alive ? `HP ${Math.round(player.hp)} / ${MAX_HP}` : `Respawn ${player.respawnTimer.toFixed(1)}s`,
      ]
        .filter(Boolean)
        .join("  |  ")
    : "Lead the blue team.";

  ctx.fillText(powerups || "No active powerup", WORLD.width / 2, 98);
  ctx.fillText("Move: WASD / Arrows   Shoot: Mouse / Space   F: Fullscreen", WORLD.width / 2, 118);

  if (state.message) {
    drawHudPanel(WORLD.width / 2 - 260, WORLD.height - 98, 520, 58);
    ctx.fillStyle = "#ffecb8";
    ctx.font = "700 24px Trebuchet MS";
    ctx.fillText(state.message, WORLD.width / 2, WORLD.height - 60);
  }

  if (player && !player.alive) {
    const text = `${player.label} respawns in ${player.respawnTimer.toFixed(1)}s`;
    drawHudPanel(WORLD.width / 2 - 170, 132, 340, 50);
    ctx.fillStyle = "#edf7ff";
    ctx.font = "700 20px Trebuchet MS";
    ctx.fillText(text, WORLD.width / 2, 164);
  }

  if (state.mode === "playing" || state.mode === "paused") {
    const pauseButton = { id: "pause", x: WORLD.width - 164, y: WORLD.height - 88, w: 136, h: 50 };
    state.buttons.push(pauseButton);
    drawButton(pauseButton, state.mode === "paused" ? "Paused" : "Pause");
  }
}

function drawMenu() {
  const map = getCurrentMap();
  drawArena();
  drawParticles();

  ctx.save();
  ctx.fillStyle = "rgba(5, 12, 18, 0.52)";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.restore();

  ctx.fillStyle = "#edf7ff";
  ctx.font = "700 72px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("TOP VIEW TANK BATTLE", WORLD.width / 2, 200);

  ctx.fillStyle = "#ffb84d";
  ctx.font = "600 28px Trebuchet MS";
  ctx.fillText("Choose a map, set N vs M, and lead the blue squad.", WORLD.width / 2, 252);

  drawMapSelector(WORLD.width / 2 - 430, 296, map);
  drawMenuSelector(
    WORLD.width / 2 - 450,
    498,
    "Blue Team",
    "includes you + ally bots",
    state.config.friendlyCount,
    "dec-friendly",
    "inc-friendly",
    "#79d6ff"
  );
  drawMenuSelector(
    WORLD.width / 2 + 150,
    498,
    "Red Team",
    "enemy bot squad",
    state.config.enemyCount,
    "dec-enemy",
    "inc-enemy",
    "#ff876c"
  );

  ctx.fillStyle = "#98b5c7";
  ctx.font = "500 21px Trebuchet MS";
  ctx.fillText(
    `Current matchup ${state.config.friendlyCount} vs ${state.config.enemyCount}   |   First to ${state.scoreTarget} team kills`,
    WORLD.width / 2,
    744
  );

  const startButton = { id: "start", x: WORLD.width / 2 - 180, y: 772, w: 360, h: 72 };
  state.buttons.push(startButton);
  drawButton(startButton, `Start ${state.config.friendlyCount} vs ${state.config.enemyCount}`, {
    fontSize: 30,
    radius: 20,
  });
}

function drawFinishedOverlay() {
  const player = getLocalPlayer();
  const didWin = !!player && state.winnerTeam === player.teamId;

  ctx.save();
  ctx.fillStyle = "rgba(5, 12, 18, 0.62)";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.restore();

  drawHudPanel(WORLD.width / 2 - 320, 220, 640, 320);
  ctx.fillStyle = "#edf7ff";
  ctx.font = "700 58px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(didWin ? "VICTORY" : "DEFEAT", WORLD.width / 2, 304);
  ctx.fillStyle = "#ffecb8";
  ctx.font = "600 28px Trebuchet MS";
  ctx.fillText(state.message, WORLD.width / 2, 352);
  ctx.fillStyle = "#98b5c7";
  ctx.font = "500 24px Trebuchet MS";
  ctx.fillText(`Final Score ${state.teams.blue.score} : ${state.teams.red.score}`, WORLD.width / 2, 396);
  ctx.fillText(`Match ${state.config.friendlyCount} vs ${state.config.enemyCount}`, WORLD.width / 2, 430);

  const restartButton = { id: "restart", x: WORLD.width / 2 - 186, y: 462, w: 372, h: 64 };
  const menuButton = { id: "menu", x: WORLD.width / 2 - 120, y: 548, w: 240, h: 56 };
  state.buttons.push(restartButton, menuButton);
  drawButton(restartButton, "Restart Battle", { fontSize: 30, radius: 18 });
  drawButton(menuButton, "Back to Menu", { fontSize: 26, radius: 18 });
}

function drawPauseOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(5, 12, 18, 0.68)";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.restore();

  drawHudPanel(WORLD.width / 2 - 280, 190, 560, 410);
  ctx.fillStyle = "#edf7ff";
  ctx.font = "700 54px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("PAUSED", WORLD.width / 2, 270);
  ctx.fillStyle = "#98b5c7";
  ctx.font = "500 24px Trebuchet MS";
  ctx.fillText(`Current map: ${getCurrentMap().name}`, WORLD.width / 2, 320);

  const menuButton = { id: "menu", x: WORLD.width / 2 - 170, y: 366, w: 340, h: 64 };
  const resumeButton = { id: "resume", x: WORLD.width / 2 - 170, y: 448, w: 340, h: 64 };
  const restartButton = { id: "restart", x: WORLD.width / 2 - 170, y: 530, w: 340, h: 64 };
  state.buttons = [menuButton, resumeButton, restartButton];
  drawButton(menuButton, "Back To Lobby");
  drawButton(resumeButton, "Resume");
  drawButton(restartButton, "Restart");
}

function render() {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  state.buttons = [];

  if (state.mode === "menu") {
    drawMenu();
    return;
  }

  drawArena();
  drawNeutralTank();
  drawPickup(state.pickup);
  drawSpecialItems();
  drawHazards();
  drawBullets();
  const orderedTanks = [...state.tanks].sort(
    (tankA, tankB) => Number(tankA.alive) - Number(tankB.alive) || Number(tankA.controlled) - Number(tankB.controlled)
  );
  for (const tank of orderedTanks) {
    drawTank(tank);
  }
  drawParticles();
  drawHud();

  if (state.mode === "paused") {
    drawPauseOverlay();
  } else if (state.mode === "finished") {
    drawFinishedOverlay();
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;
  update(dt);
  render();
  rafId = requestAnimationFrame(frame);
}

function handleKey(event, isDown) {
  if (isDown) unlockAudio();
  const key = event.key.toLowerCase();
  if (
    key === "w" ||
    key === "a" ||
    key === "s" ||
    key === "d" ||
    key === "arrowup" ||
    key === "arrowdown" ||
    key === "arrowleft" ||
    key === "arrowright" ||
    key === " " ||
    key === "spacebar" ||
    key === "enter" ||
    key === "f" ||
    key === "q" ||
    key === "e" ||
    key === "escape" ||
    key === "p"
  ) {
    event.preventDefault();
  }

  if (key === "w" || key === "arrowup") input.up = isDown;
  if (key === "s" || key === "arrowdown") input.down = isDown;
  if (key === "a" || key === "arrowleft") input.left = isDown;
  if (key === "d" || key === "arrowright") input.right = isDown;
  if (key === " " || key === "spacebar") input.fire = isDown;

  if (!isDown) return;

  if (key === "enter" && (state.mode === "menu" || state.mode === "finished")) {
    startGame();
  } else if ((key === "escape" || key === "p") && (state.mode === "playing" || state.mode === "paused")) {
    togglePause();
  } else if (key === "q" && state.mode === "menu") {
    setMapIndex(state.mapIndex - 1);
    restartToMenu();
  } else if (key === "e" && state.mode === "menu") {
    setMapIndex(state.mapIndex + 1);
    restartToMenu();
  } else if (key === "escape" && document.fullscreenElement) {
    document.exitFullscreen();
  } else if (key === "f") {
    if (!document.fullscreenElement) {
      canvas.requestFullscreen?.();
    } else {
      document.exitFullscreen();
    }
  }
}

canvas.addEventListener("mousemove", (event) => {
  updateMousePosition(event);
  const point = screenToCanvas(event.clientX, event.clientY);
  const hovered = pickButtonAt(point.x, point.y);
  state.hoveredButton = hovered ? hovered.id : null;
});

canvas.addEventListener("mousedown", (event) => {
  unlockAudio();
  updateMousePosition(event);
  const point = screenToCanvas(event.clientX, event.clientY);
  const button = pickButtonAt(point.x, point.y);
  if (button) {
    handleButtonPress(button.id);
    return;
  }
  if (event.button === 0) input.fire = true;
});

window.addEventListener("mouseup", (event) => {
  if (event.button === 0) input.fire = false;
});

window.addEventListener("keydown", (event) => handleKey(event, true));
window.addEventListener("keyup", (event) => handleKey(event, false));
window.addEventListener("blur", () => {
  input.up = false;
  input.down = false;
  input.left = false;
  input.right = false;
  input.fire = false;
});

window.addEventListener("resize", render);

function summarizeTank(tank) {
  if (!tank) return null;
  return {
    id: tank.id,
    label: tank.label,
    teamId: tank.teamId,
    controlled: tank.controlled,
    x: Number(tank.x.toFixed(1)),
    y: Number(tank.y.toFixed(1)),
    currentRadius: Number(getTankRadius(tank).toFixed(1)),
    bodyAngle: Number(tank.bodyAngle.toFixed(3)),
    turretAngle: Number(tank.turretAngle.toFixed(3)),
    hp: Number(tank.hp.toFixed(1)),
    alive: tank.alive,
    shield: tank.shield,
    rapidFireTimer: Number(tank.rapidFireTimer.toFixed(2)),
    starTimer: Number(tank.starTimer.toFixed(2)),
    mushroomTimer: Number(tank.mushroomTimer.toFixed(2)),
    score: tank.score,
    deaths: tank.deaths,
    respawnTimer: Number(tank.respawnTimer.toFixed(2)),
  };
}

function renderGameToText() {
  const player = getLocalPlayer();
  const leadEnemy = getLeadEnemy();
  const payload = {
    mode: state.mode,
    message: state.message,
    config: { ...state.config },
    localPlayerId: state.localPlayerId,
    map: {
      index: state.mapIndex,
      id: getCurrentMap().id,
      name: getCurrentMap().name,
    },
    coordinateSystem: {
      origin: "top-left",
      xPositive: "right",
      yPositive: "down",
      worldWidth: WORLD.width,
      worldHeight: WORLD.height,
    },
    scoreTarget: state.scoreTarget,
    teams: {
      blue: {
        score: state.teams.blue.score,
        count: state.teams.blue.count,
        alive: getAliveTeamCount("blue"),
      },
      red: {
        score: state.teams.red.score,
        count: state.teams.red.count,
        alive: getAliveTeamCount("red"),
      },
    },
    player: summarizeTank(player),
    bot: summarizeTank(leadEnemy),
    tanks: state.tanks.map((tank) => summarizeTank(tank)),
    bullets: state.bullets.map((bullet) => ({
      id: bullet.id,
      ownerId: bullet.ownerId,
      teamId: bullet.teamId,
      x: Number(bullet.x.toFixed(1)),
      y: Number(bullet.y.toFixed(1)),
      angle: Number(bullet.angle.toFixed(3)),
      radius: Number(bullet.radius.toFixed(1)),
    })),
    pickup: state.pickup
      ? {
          id: state.pickup.id,
          type: state.pickup.type,
          x: state.pickup.x,
          y: state.pickup.y,
        }
      : null,
    neutralTank:
      state.neutralTank && state.neutralTank.alive
        ? {
            x: state.neutralTank.x,
            y: state.neutralTank.y,
            hp: state.neutralTank.hp,
          }
        : null,
    specialItems: state.specialItems.map((item) => ({
      type: item.type,
      x: item.x,
      y: item.y,
      life: Number(item.life.toFixed(2)),
    })),
    hazards: state.hazards.map((hazard) => ({
      type: hazard.type,
      x: Number(hazard.x.toFixed(1)),
      y: Number(hazard.y.toFixed(1)),
      vx: Number(hazard.vx.toFixed(1)),
      vy: Number(hazard.vy.toFixed(1)),
    })),
    walls: getCurrentWalls().map((wall) => ({ x: wall.x, y: wall.y, w: wall.w, h: wall.h })),
    buttons: state.buttons.map((button) => ({
      id: button.id,
      x: button.x,
      y: button.y,
      w: button.w,
      h: button.h,
    })),
  };
  return JSON.stringify(payload);
}

window.render_game_to_text = renderGameToText;
window.advanceTime = async (ms) => {
  const steps = Math.max(1, Math.round(ms / (FIXED_STEP * 1000)));
  for (let index = 0; index < steps; index += 1) {
    update(FIXED_STEP);
  }
  render();
};
window.__gameDebug = {
  startGame,
  restartToMenu,
  setConfig(patch) {
    updateConfig(patch);
  },
  getState: () => JSON.parse(renderGameToText()),
  getTankIds(teamId) {
    return (teamId ? getTeamTanks(teamId) : state.tanks).map((tank) => tank.id);
  },
  togglePause,
  setMap(index) {
    setMapIndex(index);
    restartToMenu();
  },
  setTank(id, patch) {
    const tank = resolveTankIdentifier(id);
    if (!tank) return;
    Object.assign(tank, patch);
  },
  setNeutralTank(patch) {
    if (!state.neutralTank) return;
    Object.assign(state.neutralTank, patch);
  },
  setTeamScore(teamId, score) {
    if (!state.teams[teamId]) return;
    state.teams[teamId].score = Math.max(0, Math.round(score));
  },
  forcePickup(type, x, y) {
    state.pickup = {
      id: pickupIdCounter++,
      type,
      x,
      y,
      radius: PICKUP_RADIUS,
    };
  },
  forceSpecialItem(type, x, y) {
    if (type === "shell") {
      spawnShell(x, y);
      return;
    }
    spawnSpecialItem(type, x, y);
  },
  getResolvedPickupPoints() {
    return collectResolvedPickupPoints();
  },
  clearBullets() {
    state.bullets = [];
  },
  clearHazards() {
    state.hazards = [];
  },
  forceShell(x, y, vx, vy) {
    spawnShell(x, y, { vx, vy });
  },
  fire(id) {
    const tank = resolveTankIdentifier(id);
    if (tank && tank.alive) {
      spawnBullet(tank);
    }
  },
  damage(id, amount, attackerId) {
    const target = resolveTankIdentifier(id);
    const attacker = resolveTankIdentifier(attackerId);
    if (target) {
      tryApplyDamage(target, attacker || null, amount);
    }
  },
};

restartToMenu();
render();
rafId = requestAnimationFrame(frame);
