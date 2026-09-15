import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

/**
 * localhost, not 127.0.0.1. The two are different origins to anything that checks a
 * Referer, and the map key is allowed per origin by the NCP application's Web 서비스
 * URL list — so serving the suite from the loopback address meant the map never
 * authenticated and its marker test had nothing to look at. One host family to
 * register, spelled the same way as the dev server's.
 */
const ORIGIN = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: ORIGIN,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // build:fixtures, not build. src/lib/data.ts refuses to serve content/generated
    // in a production build unless MODU_DATA_SOURCE says so out loud, and these tests
    // are precisely a production build over the committed fixtures.
    command: `pnpm build:fixtures && pnpm start:fixtures --port ${PORT}`,
    url: `${ORIGIN}/ko`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
