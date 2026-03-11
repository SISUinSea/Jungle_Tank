const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WORLD = { width: 1600, height: 900 };
const FIXED_STEP = 1 / 60;
const MIN_SCORE_TO_WIN = 3;
const MIN_TEAM_SIZE = 1;
const MAX_TEAM_SIZE = 6;
const DEFAULT_CONFIG = { friendlyCount: 2, enemyCount: 2 };
const TANK_RADIUS = 28;
const MAX_HP = 100;
const PLAYER_SPEED = 268;
const BOT_SPEED = 236;
const BULLET_SPEED = 760;
const BULLET_LIFETIME = 1.55;
const BULLET_DAMAGE = 34;
const BASE_FIRE_COOLDOWN = 0.42;
const RAPID_FIRE_COOLDOWN = 0.18;
const RESPAWN_TIME = 2.15;
const PICKUP_RESPAWN = 7.8;

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

const WALLS = [
  { x: 545, y: 180, w: 130, h: 180 },
  { x: 545, y: 540, w: 130, h: 180 },
  { x: 925, y: 180, w: 130, h: 180 },
  { x: 925, y: 540, w: 130, h: 180 },
  { x: 735, y: 340, w: 130, h: 220 },
  { x: 260, y: 160, w: 120, h: 48 },
  { x: 260, y: 692, w: 120, h: 48 },
  { x: 1220, y: 160, w: 120, h: 48 },
  { x: 1220, y: 692, w: 120, h: 48 },
];

const PICKUP_POINTS = [
  { x: 800, y: 140 },
  { x: 800, y: 760 },
  { x: 800, y: 450 },
  { x: 450, y: 450 },
  { x: 1150, y: 450 },
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
  bullets: [],
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
  const topPadding = 120;
  const usableHeight = WORLD.height - topPadding * 2;
  const direction = side === "left" ? 1 : -1;
  const baseX = side === "left" ? 190 : WORLD.width - 190;
  const angle = side === "left" ? 0 : Math.PI;

  return Array.from({ length: count }, (_, index) => {
    const y =
      count === 1
        ? WORLD.height / 2
        : topPadding + (usableHeight * (index + 1)) / (count + 1);
    const columnOffset = (index % 2) * 54;
    const depthOffset = Math.floor(index / 2) * 14;
    return {
      x: baseX + direction * (columnOffset + depthOffset),
      y,
      angle,
    };
  });
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
  state.mode = "playing";
  state.time = 0;
  state.round = 1;
  state.scoreTarget = getScoreTarget(config);
  state.teams = createTeams(config);
  state.tanks = matchState.tanks;
  state.botBrains = matchState.botBrains;
  state.localPlayerId = matchState.localPlayerId;
  state.message = `${config.friendlyCount} vs ${config.enemyCount}. First to ${state.scoreTarget} team kills wins.`;
  state.messageTimer = 2.6;
  state.buttons = [];
  state.hoveredButton = null;
  state.pickup = null;
  state.pickupTimer = 2.5;
  state.bullets = [];
  state.particles = [];
  state.winnerTeam = null;
}

function restartToMenu() {
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
  state.bullets = [];
  state.particles = [];
  state.tanks = [];
  state.teams = createTeams(state.config);
  state.botBrains = {};
  state.localPlayerId = null;
  state.winnerTeam = null;
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
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const px = lerp(x1, x2, t);
    const py = lerp(y1, y2, t);
    for (const wall of WALLS) {
      if (px >= wall.x && px <= wall.x + wall.w && py >= wall.y && py <= wall.y + wall.h) {
        return true;
      }
    }
  }
  return false;
}

function resolveTankMovement(tank, moveX, moveY, speed, dt) {
  if (!tank.alive) return;

  let nextX = tank.x + moveX * speed * dt;
  nextX = clamp(nextX, tank.radius, WORLD.width - tank.radius);
  let collidedX = false;
  for (const wall of WALLS) {
    if (circleRectCollides(nextX, tank.y, tank.radius, wall)) {
      collidedX = true;
      break;
    }
  }
  if (!collidedX) {
    tank.x = nextX;
  }

  let nextY = tank.y + moveY * speed * dt;
  nextY = clamp(nextY, tank.radius, WORLD.height - tank.radius);
  let collidedY = false;
  for (const wall of WALLS) {
    if (circleRectCollides(tank.x, nextY, tank.radius, wall)) {
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

  let nextX = clamp(tank.x + dx, tank.radius, WORLD.width - tank.radius);
  let collidedX = false;
  for (const wall of WALLS) {
    if (circleRectCollides(nextX, tank.y, tank.radius, wall)) {
      collidedX = true;
      break;
    }
  }
  if (!collidedX) {
    tank.x = nextX;
  }

  let nextY = clamp(tank.y + dy, tank.radius, WORLD.height - tank.radius);
  let collidedY = false;
  for (const wall of WALLS) {
    if (circleRectCollides(tank.x, nextY, tank.radius, wall)) {
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
        const minDist = tankA.radius + tankB.radius + 4;
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
  const muzzleDistance = owner.radius + 18;
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
    radius: 6,
    color: owner.bulletColor,
  });
  owner.fireCooldown = owner.rapidFireTimer > 0 ? RAPID_FIRE_COOLDOWN : BASE_FIRE_COOLDOWN;
  addFlash(owner.x, owner.y, owner.color, 34, 0.16);
}

function finishMatch(teamId) {
  state.mode = "finished";
  state.winnerTeam = teamId;
  state.message = `${TEAM_META[teamId].name} wins the battle.`;
  state.messageTimer = 999;
  state.bullets = [];
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
  tank.shield = false;
  tank.flashTimer = 0.18;
}

function tryApplyDamage(target, attacker, damage) {
  if (!target.alive) return false;
  if (target.shield) {
    target.shield = false;
    target.flashTimer = 0.18;
    addFlash(target.x, target.y, "#a5f1ff", 52, 0.22);
    showMessage(`${target.label} shield cracked.`, 0.8);
    return true;
  }
  target.hp = Math.max(0, target.hp - damage);
  target.flashTimer = 0.16;
  addFlash(target.x, target.y, "#ffffff", 28, 0.12);
  if (target.hp <= 0) {
    killTank(target, attacker);
  }
  return true;
}

function maybeSpawnPickup(dt) {
  if (state.pickup || state.mode !== "playing") return;
  state.pickupTimer -= dt;
  if (state.pickupTimer > 0) return;

  const point = PICKUP_POINTS[Math.floor(Math.random() * PICKUP_POINTS.length)];
  const type = PICKUP_TYPES[Math.floor(Math.random() * PICKUP_TYPES.length)];
  state.pickup = {
    id: pickupIdCounter++,
    type,
    x: point.x,
    y: point.y,
    radius: 22,
  };
}

function applyPickup(tank, pickup) {
  if (pickup.type === "heal") {
    tank.hp = Math.min(MAX_HP, tank.hp + 42);
    showMessage(`${tank.label} repairs armor.`, 1.0);
    addFlash(tank.x, tank.y, "#8cffae", 46, 0.24);
  } else if (pickup.type === "rapid") {
    tank.rapidFireTimer = 5.8;
    showMessage(`${tank.label} grabs rapid fire.`, 1.0);
    addFlash(tank.x, tank.y, "#ffd166", 48, 0.24);
  } else if (pickup.type === "shield") {
    tank.shield = true;
    showMessage(`${tank.label} activates a shield.`, 1.0);
    addFlash(tank.x, tank.y, "#7ef2ff", 48, 0.24);
  }
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

function updateBullets(dt) {
  const nextBullets = [];
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
    for (const wall of WALLS) {
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

    let target = null;
    let targetDistSq = Infinity;
    for (const tank of state.tanks) {
      if (!tank.alive || tank.teamId === bullet.teamId) continue;
      const dx = bullet.x - tank.x;
      const dy = bullet.y - tank.y;
      const hitDistance = tank.radius + bullet.radius;
      const distSq = dx * dx + dy * dy;
      if (distSq <= hitDistance * hitDistance && distSq < targetDistSq) {
        target = tank;
        targetDistSq = distSq;
      }
    }

    if (target) {
      const attacker = getTankById(bullet.ownerId);
      if (attacker) {
        tryApplyDamage(target, attacker, BULLET_DAMAGE);
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
  if (tank.flashTimer > 0) tank.flashTimer = Math.max(0, tank.flashTimer - dt);
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
  resolveTankMovement(tank, moveX, moveY, tank.speed, dt);

  if (input.fire && tank.fireCooldown <= 0) {
    spawnBullet(tank);
  }

  if (state.pickup) {
    const dx = tank.x - state.pickup.x;
    const dy = tank.y - state.pickup.y;
    if (dx * dx + dy * dy <= (tank.radius + state.pickup.radius) ** 2) {
      applyPickup(tank, state.pickup);
    }
  }
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
  for (const wall of WALLS) {
    if (circleRectCollides(probeX, probeY, tank.radius, wall)) {
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

  resolveTankMovement(tank, moveX, moveY, tank.speed, dt);

  if (state.pickup) {
    const dx = tank.x - state.pickup.x;
    const dy = tank.y - state.pickup.y;
    if (dx * dx + dy * dy <= (tank.radius + state.pickup.radius) ** 2) {
      applyPickup(tank, state.pickup);
    }
  }

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
  if (!state.tanks.length || state.mode !== "playing") return;

  for (const tank of state.tanks) {
    updateTankStatus(tank, dt);
  }

  updatePlayer(dt);
  for (const tank of state.tanks) {
    if (!tank.controlled) {
      updateBot(tank, dt);
    }
  }
  separateOverlappingTanks(2);
  updateBullets(dt);
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
  if (id === "start" || id === "restart") {
    startGame();
    return;
  }
  if (id === "menu") {
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
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  gradient.addColorStop(0, "#132b39");
  gradient.addColorStop(1, "#0b1821");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#d9f5ff";
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

  ctx.strokeStyle = "rgba(140, 204, 255, 0.22)";
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, WORLD.width - 32, WORLD.height - 32);

  for (const wall of WALLS) {
    const wallGradient = ctx.createLinearGradient(wall.x, wall.y, wall.x, wall.y + wall.h);
    wallGradient.addColorStop(0, "#294457");
    wallGradient.addColorStop(1, "#172b37");
    ctx.fillStyle = wallGradient;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.strokeStyle = "rgba(234, 249, 255, 0.1)";
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

function drawTank(tank) {
  const bodyScale = tank.alive ? 1 : 0.85;
  const flash = tank.flashTimer > 0 ? 0.45 + Math.sin(state.time * 40) * 0.2 : 0;
  ctx.save();
  ctx.translate(tank.x, tank.y);

  if (tank.controlled && tank.alive) {
    ctx.strokeStyle = "rgba(255, 232, 177, 0.75)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, tank.radius + 14, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (tank.shield && tank.alive) {
    ctx.strokeStyle = "rgba(126, 242, 255, 0.88)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, tank.radius + 9 + Math.sin(state.time * 5) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.rotate(tank.bodyAngle);
  ctx.scale(bodyScale, bodyScale);
  ctx.fillStyle = tank.alive ? tank.color : "rgba(128, 144, 158, 0.46)";
  ctx.strokeStyle = tank.accent;
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
  ctx.fillStyle = tank.accent;
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
  ctx.fillStyle = tank.color;
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
    roundRect(ctx, -8, -4, 16, 8, 4);
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

function drawHud() {
  const player = getLocalPlayer();
  const blueAlive = getAliveTeamCount("blue");
  const redAlive = getAliveTeamCount("red");

  drawHudPanel(22, 20, 350, 110);
  drawHudPanel(WORLD.width - 372, 20, 350, 110);
  drawHudPanel(500, 20, 600, 110);

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
  ctx.fillText(`Match ${state.config.friendlyCount} vs ${state.config.enemyCount}   Round ${state.round}`, WORLD.width / 2, 52);

  const powerups = player
    ? [
        player.shield ? "Shield" : null,
        player.rapidFireTimer > 0 ? `Rapid ${player.rapidFireTimer.toFixed(1)}s` : null,
        player.alive ? `HP ${Math.round(player.hp)} / ${MAX_HP}` : `Respawn ${player.respawnTimer.toFixed(1)}s`,
      ]
        .filter(Boolean)
        .join("  |  ")
    : "Lead the blue team.";

  ctx.font = "600 18px Trebuchet MS";
  ctx.fillStyle = "#98b5c7";
  ctx.fillText(powerups || "No active powerup", WORLD.width / 2, 84);
  ctx.fillText("Move: WASD / Arrows   Shoot: Mouse / Space   F: Fullscreen", WORLD.width / 2, 108);

  if (state.message) {
    drawHudPanel(WORLD.width / 2 - 260, WORLD.height - 98, 520, 58);
    ctx.fillStyle = "#ffecb8";
    ctx.font = "700 24px Trebuchet MS";
    ctx.fillText(state.message, WORLD.width / 2, WORLD.height - 60);
  }
}

function drawMenu() {
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
  ctx.fillText("Scale the arena to any N vs M team fight and lead the blue squad.", WORLD.width / 2, 252);

  drawHudPanel(WORLD.width / 2 - 520, 300, 1040, 290);
  ctx.fillStyle = "#edf7ff";
  ctx.font = "600 26px Trebuchet MS";
  ctx.fillText("Team Setup", WORLD.width / 2, 350);

  drawMenuSelector(WORLD.width / 2 - 450, 372, "Blue Team", "includes you + ally bots", state.config.friendlyCount, "dec-friendly", "inc-friendly", "#79d6ff");
  drawMenuSelector(WORLD.width / 2 + 150, 372, "Red Team", "enemy bot squad", state.config.enemyCount, "dec-enemy", "inc-enemy", "#ff876c");

  ctx.fillStyle = "#98b5c7";
  ctx.font = "500 21px Trebuchet MS";
  ctx.fillText(
    `Current matchup ${state.config.friendlyCount} vs ${state.config.enemyCount}   |   First to ${state.scoreTarget} team kills`,
    WORLD.width / 2,
    622
  );

  const startButton = { id: "start", x: WORLD.width / 2 - 180, y: 666, w: 360, h: 76 };
  state.buttons.push(startButton);
  drawButton(startButton, `Start ${state.config.friendlyCount} vs ${state.config.enemyCount}`, {
    fontSize: 30,
    radius: 20,
  });

  ctx.fillStyle = "#98b5c7";
  ctx.font = "500 18px Trebuchet MS";
  ctx.fillText("Press Enter to begin", WORLD.width / 2, 792);
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

function render() {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  state.buttons = [];

  if (state.mode === "menu") {
    drawMenu();
    return;
  }

  drawArena();
  drawPickup(state.pickup);
  drawBullets();
  const orderedTanks = [...state.tanks].sort(
    (tankA, tankB) => Number(tankA.alive) - Number(tankB.alive) || Number(tankA.controlled) - Number(tankB.controlled)
  );
  for (const tank of orderedTanks) {
    drawTank(tank);
  }
  drawParticles();
  drawHud();

  if (state.mode === "finished") {
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
    key === "f"
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
    bodyAngle: Number(tank.bodyAngle.toFixed(3)),
    turretAngle: Number(tank.turretAngle.toFixed(3)),
    hp: Number(tank.hp.toFixed(1)),
    alive: tank.alive,
    shield: tank.shield,
    rapidFireTimer: Number(tank.rapidFireTimer.toFixed(2)),
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
    })),
    pickup: state.pickup
      ? {
          id: state.pickup.id,
          type: state.pickup.type,
          x: state.pickup.x,
          y: state.pickup.y,
        }
      : null,
    walls: WALLS.map((wall) => ({ x: wall.x, y: wall.y, w: wall.w, h: wall.h })),
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
  setTank(id, patch) {
    const tank = resolveTankIdentifier(id);
    if (!tank) return;
    Object.assign(tank, patch);
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
      radius: 22,
    };
  },
  clearBullets() {
    state.bullets = [];
  },
  fire(id) {
    const tank = resolveTankIdentifier(id);
    if (tank && tank.alive) {
      spawnBullet(tank);
    }
  },
};

restartToMenu();
render();
rafId = requestAnimationFrame(frame);
