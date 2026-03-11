const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const baseUrl = `http://127.0.0.1:${process.env.PORT || 4173}`;

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__gameDebug && window.advanceTime), null, { timeout: 5000 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);

  const initial = await page.evaluate(() => window.__gameDebug.getState());

  const shieldState = await page.evaluate(async () => {
    window.__gameDebug.forcePickup("shield", 210, 450);
    await window.advanceTime(150);
    return window.__gameDebug.getState();
  });

  const rapidState = await page.evaluate(async () => {
    window.__gameDebug.forcePickup("rapid", 210, 450);
    await window.advanceTime(150);
    return window.__gameDebug.getState();
  });

  const scoreState = await page.evaluate(async () => {
    window.__gameDebug.clearBullets();
    window.__gameDebug.setTank("player", {
      x: 340,
      y: 450,
      bodyAngle: 0,
      turretAngle: 0,
      fireCooldown: 0,
      hp: 100,
      alive: true,
      shield: false,
      score: 0,
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
    window.__gameDebug.fire("player");
    await window.advanceTime(500);
    return window.__gameDebug.getState();
  });

  const finishState = await page.evaluate(async () => {
    window.__gameDebug.clearBullets();
    window.__gameDebug.setTank("player", {
      x: 340,
      y: 450,
      bodyAngle: 0,
      turretAngle: 0,
      fireCooldown: 0,
      hp: 100,
      alive: true,
      shield: false,
      score: 2,
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
    window.__gameDebug.fire("player");
    await window.advanceTime(500);
    return window.__gameDebug.getState();
  });

  const mapState = await page.evaluate(async () => {
    window.__gameDebug.setMap(4);
    window.__gameDebug.startGame();
    await window.advanceTime(100);
    return window.__gameDebug.getState();
  });

  const assertions = [
    {
      name: "initial mode is playing",
      pass: initial.mode === "playing",
      actual: initial.mode,
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
      name: "player scores after lethal shot",
      pass: scoreState.player.score === 1 && scoreState.bot.alive === false,
      actual: {
        playerScore: scoreState.player.score,
        botAlive: scoreState.bot.alive,
      },
    },
    {
      name: "match finishes at 3 kills",
      pass: finishState.mode === "finished" && finishState.player.score === 3,
      actual: {
        mode: finishState.mode,
        playerScore: finishState.player.score,
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
