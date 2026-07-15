// Smoke test headless: carrega o jogo, dirige o fluxo básico (menu, mundo,
// diálogo, menu, combate) e captura erros de runtime + screenshots.
// Requer o dev server (npm run dev) e o Chromium do Playwright.
//   SHOT_DIR=<pasta> node tests/e2e/smoke.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.env.SMOKE_URL || 'http://localhost:3000';
const DIR = process.env.SHOT_DIR || '.smoke';
mkdirSync(DIR, { recursive: true });

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
});

const shot = (name) => page.screenshot({ path: `${DIR}/${name}.png` });
const step = async (key) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(150);
  await page.keyboard.up(key);
  await page.waitForTimeout(120);
};

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(3200); // boot -> preload -> main menu
await shot('1-menu');

await page.mouse.click(640, 360); // Novo Jogo
await page.waitForTimeout(1600);
await shot('2-world');

await step('ArrowRight');
await step('ArrowRight');
await page.keyboard.press('e'); // falar com o Cavaleiro Moribundo
await page.waitForTimeout(800);
await shot('3-dialogue');
for (let i = 0; i < 3; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
}
await shot('4-after-dialogue');

await page.keyboard.press('i'); // menu do jogo
await page.waitForTimeout(700);
await shot('5-game-menu');
await page.keyboard.press('i'); // fechar
await page.waitForTimeout(500);

await page.keyboard.press('b'); // debug: força um encontro
await page.waitForTimeout(1400);
await shot('6-battle');

await page.mouse.click(120, 590); // Atacar
await page.waitForTimeout(500);
await page.mouse.click(560, 245); // clicar num inimigo
await page.waitForTimeout(1600);
await shot('7-battle-action');
await page.waitForTimeout(1800);
await shot('8-battle-later');

await browser.close();
console.log(`SCREENSHOTS em ${DIR}`);
console.log(`ERROS: ${errors.length}`);
for (const e of errors) console.log(' -', e);
process.exit(errors.length ? 1 : 0);
