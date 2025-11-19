import { request } from "@playwright/test";

const DEFAULT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://tunescout.local.com:3000";

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function globalSetup() {
  const baseURL = DEFAULT_BASE_URL.replace(/\/$/, "");
  const ctx = await request.newContext({ baseURL, ignoreHTTPSErrors: true });

  const maxAttempts = Number(process.env.PW_WAIT_ATTEMPTS ?? 60);
  const delayMs = Number(process.env.PW_WAIT_DELAY_MS ?? 1000);

  let healthy = false;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await ctx.get("/");
      if (res.ok()) {
        healthy = true;
        break;
      }
    } catch (error) {
      lastError = error;
    }

    try {
      const health = await ctx.get("/api/health");
      if (health.ok()) {
        healthy = true;
        break;
      }
    } catch (error) {
      lastError = error;
    }

    await wait(delayMs);
  }

  await ctx.dispose();

  if (!healthy) {
    const hint = `Base URL ${baseURL} is not reachable after ${maxAttempts} attempts.`;
    const extra = lastError instanceof Error ? ` Last error: ${lastError.message}` : "";
    throw new Error(hint + extra);
  }
}
