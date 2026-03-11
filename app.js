const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WORLD = { width: 1600, height: 900 };
const FIXED_STEP = 1 / 60;
const TARGET_SCORE = 3;
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

const SPAWNS = {
  player: { x: 210, y: WORLD.height / 2, angle: 0 },
  bot: { x: WORLD.width - 210, y: WORLD.height / 2, angle: Math.PI },
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
  message: "",
  messageTimer: 0,
  buttons: [],
  hoveredButton: null,
  pickup: null,
  pickupTimer: 2.5,
  bullets: [],
  particles: [],
  botBrain: null,
  player: null,
  bot: null,
  winner: null,
};

let bulletIdCounter = 1;
let pickupIdCounter = 1;
let lastFrameTime = performance.now();
let rafId = 0;

function createTank(id, label, color, accent, spawn) {
  return {
    id,
    label,
    color,
    accent,
    spawn,
    x: spawn.x,
    y: spawn.y,
    radius: TANK_RADIUS,
    bodyAngle: spawn.angle,
    turretAngle: spawn.angle,
    hp: MAX_HP,
    score: 0,
    alive: true,
    respawnTimer: 0,
    fireCooldown: 0,
    rapidFireTimer: 0,
    shield: false,
    flashTimer: 0,
    moveX: 0,
    moveY: 0,
    lastHitBy: null,
  };
}

function resetMatch() {
  state.player = createTank("player", "PLAYER", "#79d6ff", "#fff1b1", SPAWNS.player);
  state.bot = createTank("bot", "BOT", "#ff876c", "#ffe8d9", SPAWNS.bot);
  state.mode = "playing";
  state.time = 0;
  state.round = 1;
  state.message = "First to 3 kills wins.";
  state.messageTimer = 2.4;
  state.pickup = null;
  state.pickupTimer = 2.5;
  state.bullets = [];
  state.particles = [];
  state.winner = null;
  state.botBrain = {
    strafeDir: 1,
    switchTimer: 0.9,
    dodgeTimer: 0,
    burstCooldown: 0,
    retreatTimer: 0,
  };
}

function restartToMenu() {
  state.player = createTank("player", "PLAYER", "#79d6ff", "#fff1b1", SPAWNS.player);
  state.bot = createTank("bot", "BOT", "#ff876c", "#ffe8d9", SPAWNS.bot);
  state.mode = "menu";
  state.message = "";
  state.messageTimer = 0;
  state.buttons = [];
  state.hoveredButton = null;
  state.pickup = null;
  state.bullets = [];
  state.particles = [];
  state.winner = null;
}

function startGame() {
  resetMatch();
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
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
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

function spawnBullet(owner) {
  const muzzleDistance = owner.radius + 18;
  const angle = owner.turretAngle;
  state.bullets.push({
    id: bulletIdCounter++,
    ownerId: owner.id,
    x: owner.x + Math.cos(angle) * muzzleDistance,
    y: owner.y + Math.sin(angle) * muzzleDistance,
    vx: Math.cos(angle) * BULLET_SPEED,
    vy: Math.sin(angle) * BULLET_SPEED,
    angle,
    life: BULLET_LIFETIME,
    radius: 6,
  });
  owner.fireCooldown = owner.rapidFireTimer > 0 ? RAPID_FIRE_COOLDOWN : BASE_FIRE_COOLDOWN;
  addFlash(owner.x, owner.y, owner.color, 34, 0.16);
}

function killTank(victim, attacker) {
  victim.alive = false;
  victim.respawnTimer = RESPAWN_TIME;
  victim.hp = 0;
  victim.shield = false;
  attacker.score += 1;
  attacker.lastHitBy = attacker.id;
  state.round += 1;
  addBurst(victim.x, victim.y, victim.color, 68, 0.45);
  showMessage(`${attacker.label} scores!`, 1.25);

  if (attacker.score >= TARGET_SCORE) {
    state.mode = "finished";
    state.winner = attacker.id;
    state.message = attacker.id === "player" ? "You win the duel." : "The bot wins the duel.";
    state.messageTimer = 999;
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

    const target = bullet.ownerId === "player" ? state.bot : state.player;
    if (target.alive) {
      const dx = bullet.x - target.x;
      const dy = bullet.y - target.y;
      const hitDistance = target.radius + bullet.radius;
      if (dx * dx + dy * dy <= hitDistance * hitDistance) {
        const attacker = bullet.ownerId === "player" ? state.player : state.bot;
        tryApplyDamage(target, attacker, BULLET_DAMAGE);
        destroyed = true;
      }
    }

    if (!destroyed) nextBullets.push(bullet);
  }
  state.bullets = nextBullets;
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
  const tank = state.player;
  if (!tank.alive) return;

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
  resolveTankMovement(tank, moveX, moveY, PLAYER_SPEED, dt);

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

function updateBot(dt) {
  const tank = state.bot;
  const player = state.player;
  const brain = state.botBrain;
  if (!tank.alive) return;

  brain.switchTimer -= dt;
  brain.burstCooldown = Math.max(0, brain.burstCooldown - dt);
  brain.dodgeTimer = Math.max(0, brain.dodgeTimer - dt);
  brain.retreatTimer = Math.max(0, brain.retreatTimer - dt);

  if (brain.switchTimer <= 0) {
    brain.switchTimer = 0.75 + Math.random() * 0.8;
    brain.strafeDir *= Math.random() > 0.3 ? -1 : 1;
  }

  let targetX = player.x;
  let targetY = player.y;
  let desiredDistance = 340;

  if (state.pickup) {
    const needsPickup =
      (state.pickup.type === "heal" && tank.hp < 58) ||
      (state.pickup.type === "shield" && !tank.shield) ||
      (state.pickup.type === "rapid" && tank.rapidFireTimer < 1);
    if (needsPickup) {
      targetX = state.pickup.x;
      targetY = state.pickup.y;
      desiredDistance = 12;
    }
  }

  const toPlayerX = player.x - tank.x;
  const toPlayerY = player.y - tank.y;
  const distanceToPlayer = Math.hypot(toPlayerX, toPlayerY) || 1;
  const aimAngle = Math.atan2(toPlayerY, toPlayerX);
  tank.turretAngle = aimAngle;

  if (distanceToPlayer < 220 && !tank.shield) {
    brain.retreatTimer = 0.5;
  }

  let moveX = 0;
  let moveY = 0;

  if (brain.retreatTimer > 0) {
    moveX = -toPlayerX / distanceToPlayer;
    moveY = -toPlayerY / distanceToPlayer;
  } else {
    const toTargetX = targetX - tank.x;
    const toTargetY = targetY - tank.y;
    const distanceToTarget = Math.hypot(toTargetX, toTargetY) || 1;
    if (distanceToTarget > desiredDistance + 24) {
      moveX = toTargetX / distanceToTarget;
      moveY = toTargetY / distanceToTarget;
    } else if (distanceToPlayer < desiredDistance - 40) {
      moveX = -toPlayerX / distanceToPlayer;
      moveY = -toPlayerY / distanceToPlayer;
    }

    moveX += (-toPlayerY / distanceToPlayer) * 0.75 * brain.strafeDir;
    moveY += (toPlayerX / distanceToPlayer) * 0.75 * brain.strafeDir;
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

  resolveTankMovement(tank, moveX, moveY, BOT_SPEED, dt);

  if (state.pickup) {
    const dx = tank.x - state.pickup.x;
    const dy = tank.y - state.pickup.y;
    if (dx * dx + dy * dy <= (tank.radius + state.pickup.radius) ** 2) {
      applyPickup(tank, state.pickup);
    }
  }

  const hasSight = !lineBlocked(tank.x, tank.y, player.x, player.y);
  const angleError = Math.abs(angleDiff(tank.turretAngle, aimAngle));
  const wantsToShoot =
    hasSight &&
    distanceToPlayer < 700 &&
    angleError < 0.24 &&
    (distanceToPlayer < 440 || brain.burstCooldown <= 0);

  if (wantsToShoot && tank.fireCooldown <= 0) {
    spawnBullet(tank);
    brain.burstCooldown = 0.14 + Math.random() * 0.35;
  }
}

function updateGameplay(dt) {
  if (!state.player || !state.bot) return;
  updateTankStatus(state.player, dt);
  updateTankStatus(state.bot, dt);

  if (state.mode !== "playing") {
    updateBullets(dt);
    return;
  }

  updatePlayer(dt);
  updateBot(dt);
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
  if (id === "start") {
    startGame();
  } else if (id === "restart") {
    startGame();
  } else if (id === "menu") {
    restartToMenu();
  }
}

function pickButtonAt(x, y) {
  return state.buttons.find(
    (button) => x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h
  );
}

function drawButton(button, label) {
  const hovered = state.hoveredButton === button.id;
  ctx.save();
  ctx.fillStyle = hovered ? "rgba(255, 194, 96, 0.95)" : "rgba(12, 34, 47, 0.84)";
  ctx.strokeStyle = hovered ? "rgba(255, 240, 198, 0.95)" : "rgba(169, 216, 255, 0.25)";
  ctx.lineWidth = 2;
  roundRect(ctx, button.x, button.y, button.w, button.h, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = hovered ? "#132631" : "#edf7ff";
  ctx.font = "600 34px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, button.x + button.w / 2, button.y + button.h / 2 + 2);
  ctx.restore();
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
  ctx.fillStyle = tank.id === "player" ? "#79d6ff" : "#ff876c";
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
    ctx.fillStyle = bullet.ownerId === "player" ? "#e7fbff" : "#ffe6d7";
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

function drawHud() {
  drawHudPanel(22, 20, 340, 96);
  drawHudPanel(WORLD.width - 362, 20, 340, 96);
  drawHudPanel(590, 20, 420, 96);

  ctx.fillStyle = "#edf7ff";
  ctx.font = "700 26px Trebuchet MS";
  ctx.textAlign = "left";
  ctx.fillText("PLAYER", 48, 58);
  ctx.font = "600 18px Trebuchet MS";
  ctx.fillStyle = "#98b5c7";
  ctx.fillText(`HP ${Math.round(state.player.hp)} / ${MAX_HP}`, 48, 86);
  ctx.fillText(`Score ${state.player.score} / ${TARGET_SCORE}`, 48, 108);

  ctx.textAlign = "right";
  ctx.fillStyle = "#edf7ff";
  ctx.font = "700 26px Trebuchet MS";
  ctx.fillText("BOT", WORLD.width - 48, 58);
  ctx.font = "600 18px Trebuchet MS";
  ctx.fillStyle = "#98b5c7";
  ctx.fillText(`HP ${Math.round(state.bot.hp)} / ${MAX_HP}`, WORLD.width - 48, 86);
  ctx.fillText(`Score ${state.bot.score} / ${TARGET_SCORE}`, WORLD.width - 48, 108);

  ctx.textAlign = "center";
  ctx.fillStyle = "#edf7ff";
  ctx.font = "700 24px Trebuchet MS";
  ctx.fillText(`Round ${state.round}`, WORLD.width / 2, 52);
  ctx.font = "600 18px Trebuchet MS";
  ctx.fillStyle = "#98b5c7";
  const powerups = [
    state.player.shield ? "Shield" : null,
    state.player.rapidFireTimer > 0 ? `Rapid ${state.player.rapidFireTimer.toFixed(1)}s` : null,
  ]
    .filter(Boolean)
    .join("  |  ");
  ctx.fillText(powerups || "No active powerup", WORLD.width / 2, 84);
  ctx.fillText("Move: WASD / Arrows   Shoot: Mouse / Space   F: Fullscreen", WORLD.width / 2, 108);

  if (state.message) {
    drawHudPanel(WORLD.width / 2 - 250, WORLD.height - 98, 500, 58);
    ctx.fillStyle = "#ffecb8";
    ctx.font = "700 24px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(state.message, WORLD.width / 2, WORLD.height - 60);
  }

  if (!state.player.alive || !state.bot.alive) {
    const tank = state.player.alive ? state.bot : state.player;
    const text = `${tank.label} respawns in ${tank.respawnTimer.toFixed(1)}s`;
    drawHudPanel(WORLD.width / 2 - 170, 132, 340, 50);
    ctx.fillStyle = "#edf7ff";
    ctx.font = "700 20px Trebuchet MS";
    ctx.fillText(text, WORLD.width / 2, 164);
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
  ctx.fillText("TOP VIEW TANK DUEL", WORLD.width / 2, 220);

  ctx.fillStyle = "#ffb84d";
  ctx.font = "600 28px Trebuchet MS";
  ctx.fillText("Fight a live bot in an arcade top-view arena.", WORLD.width / 2, 276);

  drawHudPanel(WORLD.width / 2 - 320, 320, 640, 210);
  ctx.fillStyle = "#edf7ff";
  ctx.font = "600 26px Trebuchet MS";
  ctx.fillText("Controls", WORLD.width / 2, 370);
  ctx.font = "500 22px Trebuchet MS";
  ctx.fillStyle = "#98b5c7";
  ctx.fillText("Move with WASD or arrow keys.", WORLD.width / 2, 418);
  ctx.fillText("Aim with the mouse and fire with click or Space.", WORLD.width / 2, 452);
  ctx.fillText("Grab heal, rapid-fire, and shield pickups to outlast the bot.", WORLD.width / 2, 486);

  const startButton = { id: "start", x: WORLD.width / 2 - 150, y: 580, w: 300, h: 74 };
  state.buttons = [startButton];
  drawButton(startButton, "Start Duel");

  ctx.fillStyle = "#98b5c7";
  ctx.font = "500 18px Trebuchet MS";
  ctx.fillText("Press Enter to begin", WORLD.width / 2, 700);
}

function drawFinishedOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(5, 12, 18, 0.62)";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.restore();

  drawHudPanel(WORLD.width / 2 - 280, 220, 560, 290);
  ctx.fillStyle = "#edf7ff";
  ctx.font = "700 58px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(state.winner === "player" ? "VICTORY" : "DEFEAT", WORLD.width / 2, 304);
  ctx.fillStyle = "#ffecb8";
  ctx.font = "600 28px Trebuchet MS";
  ctx.fillText(state.message, WORLD.width / 2, 352);
  ctx.fillStyle = "#98b5c7";
  ctx.font = "500 24px Trebuchet MS";
  ctx.fillText(`Final Score ${state.player.score} : ${state.bot.score}`, WORLD.width / 2, 396);

  const restart = { id: "restart", x: WORLD.width / 2 - 170, y: 434, w: 340, h: 66 };
  state.buttons = [restart];
  drawButton(restart, "Restart Duel");
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
  drawTank(state.player);
  drawTank(state.bot);
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

  if (key === "enter" && state.mode === "menu") {
    startGame();
  } else if (key === "enter" && state.mode === "finished") {
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
    x: Number(tank.x.toFixed(1)),
    y: Number(tank.y.toFixed(1)),
    bodyAngle: Number(tank.bodyAngle.toFixed(3)),
    turretAngle: Number(tank.turretAngle.toFixed(3)),
    hp: Number(tank.hp.toFixed(1)),
    alive: tank.alive,
    shield: tank.shield,
    rapidFireTimer: Number(tank.rapidFireTimer.toFixed(2)),
    score: tank.score,
    respawnTimer: Number(tank.respawnTimer.toFixed(2)),
  };
}

function renderGameToText() {
  const payload = {
    mode: state.mode,
    message: state.message,
    coordinateSystem: {
      origin: "top-left",
      xPositive: "right",
      yPositive: "down",
      worldWidth: WORLD.width,
      worldHeight: WORLD.height,
    },
    player: summarizeTank(state.player),
    bot: summarizeTank(state.bot),
    bullets: state.bullets.map((bullet) => ({
      id: bullet.id,
      ownerId: bullet.ownerId,
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
    scoreTarget: TARGET_SCORE,
    walls: WALLS.map((wall) => ({ x: wall.x, y: wall.y, w: wall.w, h: wall.h })),
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
  getState: () => JSON.parse(renderGameToText()),
  setTank(id, patch) {
    const tank = id === "bot" ? state.bot : state.player;
    if (!tank) return;
    Object.assign(tank, patch);
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
    const tank = id === "bot" ? state.bot : state.player;
    if (tank && tank.alive) {
      spawnBullet(tank);
    }
  },
};

restartToMenu();
render();
rafId = requestAnimationFrame(frame);
