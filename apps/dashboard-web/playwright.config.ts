import { defineConfig, devices } from '@playwright/test';

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: !externalBaseUrl,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: externalBaseUrl || isCi ? 1 : undefined,
  timeout: externalBaseUrl ? 45_000 : 30_000,
  expect: { timeout: externalBaseUrl ? 15_000 : 10_000 },
  reporter: isCi ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: externalBaseUrl ?? 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: externalBaseUrl ? 15_000 : 10_000,
    navigationTimeout: externalBaseUrl ? 30_000 : 20_000,
  },
  ...(externalBaseUrl ? {} : {
    webServer: {
      command: 'pnpm dev',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !isCi,
      timeout: 120000,
    },
  }),
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
});
