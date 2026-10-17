import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const standaloneDir = resolve(here, "../showup-standalone");
const artifactsDir = resolve(here, "artifacts");
const port = Number(process.env.SHOWUP_PORT || 4173);
const baseUrl = `http://127.0.0.1:${port}`;
const knownLifecycleError =
  /Cannot read properties of undefined \(reading '(?:screen|proposeOpen)'\)/;

await mkdir(artifactsDir, { recursive: true });

const server = spawn(
  "python3",
  [
    "-m",
    "http.server",
    String(port),
    "--bind",
    "127.0.0.1",
    "--directory",
    standaloneDir,
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);

let serverError = "";
server.stderr.on("data", (chunk) => {
  serverError += chunk.toString();
});

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/Main.dc.html`);
      if (response.ok) return;
    } catch {
      // The server may still be starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`HTTP server did not start.\n${serverError}`);
}

const launchOptions = { headless: true };
if (process.env.SHOWUP_BROWSER_CHANNEL) {
  launchOptions.channel = process.env.SHOWUP_BROWSER_CHANNEL;
}

let browser;
const results = [];

async function settle(page) {
  await page.waitForTimeout(350);
  await page.evaluate(() => document.fonts?.ready);
}

async function capture(page, width, state) {
  await settle(page);
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  if (hasHorizontalOverflow) {
    throw new Error(`${state} has horizontal overflow at ${width}px`);
  }
  await page.screenshot({
    path: resolve(artifactsDir, `${state}--${width}.png`),
    fullPage: true,
  });
}

async function runViewport(width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const knownErrors = [];
  const unexpectedErrors = [];
  const httpErrors = [];
  const externalResourceIssues = [];

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (knownLifecycleError.test(text)) knownErrors.push(text);
    else if (text.startsWith("Failed to load resource:")) return;
    else unexpectedErrors.push(`console: ${text}`);
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const issue = `http ${response.status()}: ${response.url()}`;
    if (response.url().startsWith(baseUrl)) httpErrors.push(issue);
    else externalResourceIssues.push(issue);
  });
  page.on("requestfailed", (request) => {
    const issue = `request failed: ${request.url()} (${request.failure()?.errorText})`;
    if (request.url().startsWith(baseUrl)) httpErrors.push(issue);
    else externalResourceIssues.push(issue);
  });
  page.on("pageerror", (error) => {
    const text = error.stack || error.message;
    if (knownLifecycleError.test(text)) knownErrors.push(text);
    else unexpectedErrors.push(`pageerror: ${text}`);
  });

  await page.goto(`${baseUrl}/Main.dc.html`);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.getByRole("heading", { name: "What are you planning?" }).waitFor();
  await capture(page, width, "landing");

  await Promise.all([
    page.waitForURL("**/Event.dc.html"),
    page.getByRole("link", { name: "See an example" }).click(),
  ]);
  await page.getByRole("heading", { name: "Weekend plans" }).waitFor();
  await page.getByText("8 responses", { exact: true }).waitFor();
  await capture(page, width, "sample-from-landing");

  await Promise.all([
    page.waitForURL("**/Main.dc.html"),
    page.getByRole("link", { name: "Back", exact: true }).click(),
  ]);
  await page.getByRole("heading", { name: "What are you planning?" }).waitFor();

  await page.getByLabel("Event name").fill("Baseline plans");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("heading", { name: "Which days?" }).waitFor();
  await capture(page, width, "create");

  await page
    .getByRole("button", { name: /Friday 23 October/ })
    .click();
  await page
    .getByRole("button", { name: /Saturday 24 October/ })
    .click();
  await page.getByLabel("Your name").fill("Alex");
  await page.getByRole("button", { name: "Create event" }).click();
  await page
    .getByRole("heading", { name: "Which times work for you?" })
    .waitFor();
  await capture(page, width, "respond");

  const cards = page.locator(".day");
  for (let index = 0; index < 2; index += 1) {
    const card = cards.nth(index);
    await card
      .getByRole("button", { name: "Free", exact: true })
      .click();
    await card
      .getByRole("button", { name: "Yes", exact: true })
      .click();
  }

  await page.getByRole("button", { name: "Submit response" }).click();
  await page.getByRole("heading", { name: "Baseline plans" }).waitFor();
  await page.getByText("Just you so far.", { exact: true }).waitFor();
  await capture(page, width, "event");

  await Promise.all([
    page.waitForURL("**/Event.dc.html"),
    page
      .getByRole("link", { name: "Preview with sample responses" })
      .click(),
  ]);
  await page.getByText("8 responses", { exact: true }).waitFor();
  await capture(page, width, "sample-from-event");

  await Promise.all([
    page.waitForURL("**/Main.dc.html"),
    page.getByRole("link", { name: "Back", exact: true }).click(),
  ]);
  await page.getByRole("heading", { name: "Baseline plans" }).waitFor();
  await page.getByText("Just you so far.", { exact: true }).waitFor();

  if (knownErrors.length === 0) {
    unexpectedErrors.push(
      "Known componentDidUpdate lifecycle defect was not reproduced.",
    );
  }

  results.push({
    viewport: `${width}x${height}`,
    flow: "Landing → Create → Respond → Event",
    sampleNavigation: "Landing/Event → sample → Back",
    knownLifecycleErrors: knownErrors.length,
    unexpectedErrors: unexpectedErrors.concat(httpErrors),
    externalResourceIssues,
  });

  await context.close();
}

try {
  await waitForServer();
  browser = await chromium.launch(launchOptions);
  await runViewport(390, 844);
  await runViewport(1440, 900);

  console.log(JSON.stringify(results, null, 2));
  const failures = results.flatMap((result) => result.unexpectedErrors);
  if (failures.length) {
    throw new Error(`Unexpected browser errors:\n${failures.join("\n")}`);
  }
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
