// Integration smoke test for the supplied wheel picker and SHOWUP's linear
// cross-midnight minute convention. Requires a prior `npm run build`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const port = 4001;
const base = `http://127.0.0.1:${port}`;
const server = spawn('npx', ['next', 'start', '-H', '127.0.0.1', '-p', String(port)], { stdio: 'ignore' });

function assert(value, message) {
  if (!value) throw new Error(message);
}

let browser;
try {
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    up = await fetch(base).then(() => true, () => false);
  }
  assert(up, 'next start did not come up; run `npm run build` first');

  browser = await chromium.launch();
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && !/fonts\.(googleapis|gstatic)\.com/.test(message.location().url || '')) {
        errors.push(`console: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

    await page.goto(`${base}/preview/create`, { waitUntil: 'load' });
    await page.getByText('7 hr window', { exact: true }).waitFor();
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `${width}px Create page has horizontal overflow`,
    );

    const until = page.locator('.time-picker-field').filter({ hasText: 'Until' });
    await until.getByRole('spinbutton', { name: 'Hour' }).press('ArrowDown');
    await page.getByText('8 hr window', { exact: true }).waitFor();

    await page.getByRole('button', { name: 'Create event' }).click();
    await page.getByRole('heading', { name: 'Which times work for you?' }).waitFor();
    const storedWindow = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((candidate) => candidate.startsWith('showup-ev-'));
      return key ? JSON.parse(localStorage.getItem(key)).win : null;
    });
    assert(storedWindow?.s === 1020 && storedWindow?.e === 1500, `${width}px stored the wrong window: ${JSON.stringify(storedWindow)}`);

    await page.getByRole('button', { name: 'Free', exact: true }).first().click();
    const range = page.getByRole('button', { name: /5pm – 1am\. Change times/ }).first();
    await range.waitFor();
    await range.click();
    const rangeWheels = page.locator('.range-wheels').first();
    assert(
      await rangeWheels.locator('.time-picker-field').filter({ hasText: 'From' }).getByRole('spinbutton', { name: 'Hour' }).getAttribute('aria-valuetext') === '5',
      `${width}px Respond From wheel did not receive the organiser window`,
    );
    assert(
      await rangeWheels.locator('.time-picker-field').filter({ hasText: 'Until' }).getByRole('spinbutton', { name: 'Hour' }).getAttribute('aria-valuetext') === '1',
      `${width}px Respond Until wheel did not convert 1500 to 1am`,
    );
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `${width}px Respond page has horizontal overflow`,
    );
    assert(errors.length === 0, `${width}px browser errors:\n${errors.join('\n')}`);
    console.log(`ok  wheel flow @ ${width}px`);
    await page.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
