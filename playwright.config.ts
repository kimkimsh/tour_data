import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // build:fixtures, not build. src/lib/data.ts refuses to serve content/generated
    // in a production build unless MODU_DATA_SOURCE says so out loud, and these tests
    // are precisely a production build over the committed fixtures.
    command: `pnpm build:fixtures && pnpm start:fixtures --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/ko`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
