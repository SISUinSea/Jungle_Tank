const fs = require("fs");
const { chromium } = require("playwright");

async function main() {
  fs.mkdirSync("output", { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const baseUrl = `http://127.0.0.1:${process.env.PORT || 4173}`;

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__gameDebug && window.advanceTime), null, { timeout: 5000 });
  const menuState = await page.evaluate(() => window.__gameDebug.getState());

  const teamState = await page.evaluate(async () => {
    window.__gameDebug.setConfig({ friendlyCount: 2, enemyCount: 3 });
    window.__gameDebug.startGame();
    await window.advanceTime(150);
    return window.__gameDebug.getState();
  });

  const shieldState = await page.evaluate(async () => {
    const current = window.__gameDebug.getState();
    window.__gameDebug.forcePickup("shield", current.player.x, current.player.y);
    await window.advanceTime(150);
    return window.__gameDebug.getState();
  });

  const rapidState = await page.evaluate(async () => {
    const current = window.__gameDebug.getState();
    window.__gameDebug.forcePickup("rapid", current.player.x, current.player.y);
    await window.advanceTime(150);
    return window.__gameDebug.getState();
  });

  const starState = await page.evaluate(async () => {
    const before = window.__gameDebug.getState();
    window.__gameDebug.forceSpecialItem("star", before.player.x, before.player.y);
    await window.advanceTime(150);
    return window.__gameDebug.getState();
  });

  const mushroomState = await page.evaluate(async () => {
    const before = window.__gameDebug.getState();
    window.__gameDebug.forceSpecialItem("mushroom", before.player.x, before.player.y);
    await window.advanceTime(150);
    return window.__gameDebug.getState();
  });

  const shellState = await page.evaluate(async () => {
    window.__gameDebug.clearHazards();
    window.__gameDebug.setConfig({ friendlyCount: 1, enemyCount: 1 });
    window.__gameDebug.startGame();
    await window.advanceTime(50);
    window.__gameDebug.setTank("player", {
      x: 500,
      y: 500,
      hp: 100,
      alive: true,
      shield: false,
      rapidFireTimer: 0,
      starTimer: 0,
      mushroomTimer: 0,
    });
    window.__gameDebug.setTank("bot", {
      x: 1200,
      y: 700,
      hp: 100,
      alive: true,
      shield: false,
    });
    window.__gameDebug.forceShell(500, 500, 0, 0);
    await window.advanceTime(150);
    return window.__gameDebug.getState();
  });

  const scoreState = await page.evaluate(async () => {
    window.__gameDebug.setConfig({ friendlyCount: 1, enemyCount: 1 });
    window.__gameDebug.startGame();
    await window.advanceTime(50);
    window.__gameDebug.clearBullets();
    window.__gameDebug.clearHazards();
    window.__gameDebug.setTank("player", {
      x: 340,
      y: 450,
      bodyAngle: 0,
      turretAngle: 0,
      fireCooldown: 0,
      hp: 100,
      alive: true,
      shield: false,
      rapidFireTimer: 0,
      starTimer: 0,
      mushroomTimer: 0,
      score: 0,
      deaths: 0,
      respawnTimer: 0,
    });
    window.__gameDebug.setTank("bot", {
      x: 610,
      y: 450,
      bodyAngle: Math.PI,
      turretAngle: Math.PI,
      hp: 34,
      alive: true,
      shield: false,
      score: 0,
      respawnTimer: 0,
    });
    window.__gameDebug.setTeamScore("blue", 0);
    window.__gameDebug.setTeamScore("red", 0);
    window.__gameDebug.damage("bot", 34, "player");
    await window.advanceTime(100);
    return window.__gameDebug.getState();
  });

  const finishState = await page.evaluate(async () => {
    window.__gameDebug.setConfig({ friendlyCount: 1, enemyCount: 1 });
    window.__gameDebug.startGame();
    await window.advanceTime(50);
    window.__gameDebug.clearBullets();
    window.__gameDebug.clearHazards();
    window.__gameDebug.setTank("player", {
      x: 340,
      y: 450,
      bodyAngle: 0,
      turretAngle: 0,
      fireCooldown: 0,
      hp: 100,
      alive: true,
      shield: false,
      rapidFireTimer: 0,
      starTimer: 0,
      mushroomTimer: 0,
      score: 2,
      deaths: 0,
      respawnTimer: 0,
    });
    window.__gameDebug.setTank("bot", {
      x: 610,
      y: 450,
      bodyAngle: Math.PI,
      turretAngle: Math.PI,
      hp: 34,
      alive: true,
      shield: false,
      score: 0,
      respawnTimer: 0,
    });
    window.__gameDebug.setTeamScore("blue", 2);
    window.__gameDebug.setTeamScore("red", 0);
    window.__gameDebug.damage("bot", 34, "player");
    await window.advanceTime(100);
    return window.__gameDebug.getState();
  });

  const mapState = await page.evaluate(async () => {
    window.__gameDebug.setMap(4);
    window.__gameDebug.startGame();
    await window.advanceTime(100);
    return window.__gameDebug.getState();
  });

  const pickupSpawnState = await page.evaluate(async () => {
    const tankRadius = 22;
    const gridStep = 32;
    const probeStep = 16;
    const world = { width: 1600, height: 900 };
    const circleRectCollides = (x, y, radius, rect) => {
      const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
      const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
      const dx = x - nearestX;
      const dy = y - nearestY;
      return dx * dx + dy * dy < radius * radius;
    };
    const isPlacementFree = (x, y, walls) =>
      !(
        x < tankRadius ||
        x > world.width - tankRadius ||
        y < tankRadius ||
        y > world.height - tankRadius ||
        walls.some((wall) => circleRectCollides(x, y, tankRadius, wall))
      );
    const canTraverse = (x1, y1, x2, y2, walls) => {
      const distance = Math.hypot(x2 - x1, y2 - y1);
      const steps = Math.max(1, Math.ceil(distance / probeStep));
      for (let index = 0; index <= steps; index += 1) {
        const t = index / steps;
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        if (!isPlacementFree(x, y, walls)) return false;
      }
      return true;
    };
    const metrics = {
      columns: Math.floor((world.width - tankRadius * 2) / gridStep) + 1,
      rows: Math.floor((world.height - tankRadius * 2) / gridStep) + 1,
    };
    const getCenter = (column, row) => ({
      x: tankRadius + column * gridStep,
      y: tankRadius + row * gridStep,
    });
    const clampIndex = (value, max) => Math.max(0, Math.min(max, value));
    const getColumn = (x) => clampIndex(Math.round((x - tankRadius) / gridStep), metrics.columns - 1);
    const getRow = (y) => clampIndex(Math.round((y - tankRadius) / gridStep), metrics.rows - 1);
    const buildReachableGrid = (state) => {
      const walkable = Array.from({ length: metrics.rows }, () => Array(metrics.columns).fill(false));
      const reachable = Array.from({ length: metrics.rows }, () => Array(metrics.columns).fill(false));
      for (let row = 0; row < metrics.rows; row += 1) {
        for (let column = 0; column < metrics.columns; column += 1) {
          const center = getCenter(column, row);
          walkable[row][column] = isPlacementFree(center.x, center.y, state.walls);
        }
      }

      const queue = [];
      let queueIndex = 0;
      const enqueue = (column, row) => {
        if (!walkable[row]?.[column] || reachable[row][column]) return;
        reachable[row][column] = true;
        queue.push({ column, row });
      };

      for (const tank of state.tanks) {
        const baseColumn = getColumn(tank.x);
        const baseRow = getRow(tank.y);
        for (let ring = 0; ring <= 10; ring += 1) {
          let seeded = false;
          for (let dColumn = -ring; dColumn <= ring; dColumn += 1) {
            for (let dRow = -ring; dRow <= ring; dRow += 1) {
              if (Math.abs(dColumn) !== ring && Math.abs(dRow) !== ring) continue;
              const column = clampIndex(baseColumn + dColumn, metrics.columns - 1);
              const row = clampIndex(baseRow + dRow, metrics.rows - 1);
              if (!walkable[row][column]) continue;
              const center = getCenter(column, row);
              if (!canTraverse(tank.x, tank.y, center.x, center.y, state.walls)) continue;
              enqueue(column, row);
              seeded = true;
            }
          }
          if (seeded) break;
        }
      }

      const neighbors = [
        { column: 1, row: 0 },
        { column: -1, row: 0 },
        { column: 0, row: 1 },
        { column: 0, row: -1 },
      ];
      while (queueIndex < queue.length) {
        const current = queue[queueIndex];
        queueIndex += 1;
        const currentCenter = getCenter(current.column, current.row);
        for (const neighbor of neighbors) {
          const column = current.column + neighbor.column;
          const row = current.row + neighbor.row;
          if (
            column < 0 ||
            column >= metrics.columns ||
            row < 0 ||
            row >= metrics.rows ||
            !walkable[row][column] ||
            reachable[row][column]
          ) {
            continue;
          }
          const center = getCenter(column, row);
          if (!canTraverse(currentCenter.x, currentCenter.y, center.x, center.y, state.walls)) continue;
          enqueue(column, row);
        }
      }

      return reachable;
    };
    const isPointReachable = (x, y, walls, reachable) => {
      if (!isPlacementFree(x, y, walls)) return false;
      const baseColumn = getColumn(x);
      const baseRow = getRow(y);
      for (let ring = 0; ring <= 2; ring += 1) {
        for (let dColumn = -ring; dColumn <= ring; dColumn += 1) {
          for (let dRow = -ring; dRow <= ring; dRow += 1) {
            if (Math.abs(dColumn) !== ring && Math.abs(dRow) !== ring) continue;
            const column = clampIndex(baseColumn + dColumn, metrics.columns - 1);
            const row = clampIndex(baseRow + dRow, metrics.rows - 1);
            if (!reachable[row][column]) continue;
            const center = getCenter(column, row);
            if (canTraverse(center.x, center.y, x, y, walls)) return true;
          }
        }
      }
      return false;
    };

    const results = [];
    for (let mapIndex = 0; mapIndex < 5; mapIndex += 1) {
      window.__gameDebug.setMap(mapIndex);
      window.__gameDebug.startGame();
      await window.advanceTime(100);
      const state = window.__gameDebug.getState();
      const reachable = buildReachableGrid(state);
      const points = window.__gameDebug.getResolvedPickupPoints().map((point) => ({
        ...point,
        blocked:
          !isPlacementFree(point.x, point.y, state.walls),
        reachable: isPointReachable(point.x, point.y, state.walls, reachable),
      }));
      results.push({
        map: state.map.name,
        points,
      });
    }
    return results;
  });

  const assertions = [
    {
      name: "initial mode is menu",
      pass: menuState.mode === "menu",
      actual: menuState.mode,
    },
    {
      name: "configured N:M team counts apply",
      pass:
        teamState.mode === "playing" &&
        teamState.config.friendlyCount === 2 &&
        teamState.config.enemyCount === 3 &&
        teamState.teams.blue.count === 2 &&
        teamState.teams.red.count === 3 &&
        teamState.tanks.length === 5,
      actual: {
        mode: teamState.mode,
        config: teamState.config,
        blue: teamState.teams.blue,
        red: teamState.teams.red,
        tankCount: teamState.tanks.length,
      },
    },
    {
      name: "shield pickup applies",
      pass: shieldState.player.shield === true,
      actual: shieldState.player.shield,
    },
    {
      name: "rapid pickup applies",
      pass: rapidState.player.rapidFireTimer > 0,
      actual: rapidState.player.rapidFireTimer,
    },
    {
      name: "star pickup applies",
      pass: starState.player.starTimer > 0,
      actual: starState.player.starTimer,
    },
    {
      name: "mushroom pickup enlarges player",
      pass: mushroomState.player.mushroomTimer > 0 && mushroomState.player.currentRadius > 22,
      actual: {
        timer: mushroomState.player.mushroomTimer,
        radius: mushroomState.player.currentRadius,
      },
    },
    {
      name: "shell hazard damages the player",
      pass: shellState.player.hp < 100 && shellState.hazards.length === 1,
      actual: {
        hp: shellState.player.hp,
        hazards: shellState.hazards.length,
      },
    },
    {
      name: "blue team scores after lethal shot",
      pass:
        scoreState.player.score === 1 &&
        scoreState.bot.alive === false &&
        scoreState.teams.blue.score === 1,
      actual: {
        playerScore: scoreState.player.score,
        botAlive: scoreState.bot.alive,
        blueTeamScore: scoreState.teams.blue.score,
      },
    },
    {
      name: "match finishes at 3 kills",
      pass:
        finishState.mode === "finished" &&
        finishState.player.score === 3 &&
        finishState.teams.blue.score === 3 &&
        finishState.message.includes("Blue Team"),
      actual: {
        mode: finishState.mode,
        playerScore: finishState.player.score,
        blueTeamScore: finishState.teams.blue.score,
        message: finishState.message,
      },
    },
    {
      name: "map selector swaps to Emerald Rift",
      pass:
        mapState.mode === "playing" &&
        mapState.map.name === "Emerald Rift" &&
        mapState.player.x === 200 &&
        mapState.player.y === 170,
      actual: {
        mode: mapState.mode,
        map: mapState.map,
        player: mapState.player,
      },
    },
    {
      name: "selected map exposes its terrain layout",
      pass: mapState.walls.length === 7,
      actual: mapState.walls.length,
    },
    {
      name: "neutral tank spawns in match",
      pass: teamState.neutralTank && teamState.neutralTank.hp === 72,
      actual: teamState.neutralTank,
    },
    {
      name: "pickup spawn points stay on walkable ground for every map",
      pass: pickupSpawnState.every(
        (entry) =>
          entry.points.length > 0 &&
          entry.points.every((point) => point.blocked === false && point.reachable === true),
      ),
      actual: pickupSpawnState,
    },
  ];

  await page.screenshot({ path: "output/verify-final.png" });
  await browser.close();

  const failures = assertions.filter((assertion) => !assertion.pass);
  console.log(JSON.stringify({ assertions }, null, 2));
  if (failures.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
