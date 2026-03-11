const fs = require("fs");
const { chromium } = require("playwright");

async function main() {
  fs.mkdirSync("output", { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  await page.goto("http://127.0.0.1:4173", { waitUntil: "domcontentloaded" });
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

  const scoreState = await page.evaluate(async () => {
    window.__gameDebug.setConfig({ friendlyCount: 1, enemyCount: 1 });
    window.__gameDebug.startGame();
    await window.advanceTime(50);
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
    window.__gameDebug.fire("player");
    await window.advanceTime(500);
    return window.__gameDebug.getState();
  });

  const finishState = await page.evaluate(async () => {
    window.__gameDebug.setConfig({ friendlyCount: 1, enemyCount: 1 });
    window.__gameDebug.startGame();
    await window.advanceTime(50);
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
    window.__gameDebug.fire("player");
    await window.advanceTime(500);
    return window.__gameDebug.getState();
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
