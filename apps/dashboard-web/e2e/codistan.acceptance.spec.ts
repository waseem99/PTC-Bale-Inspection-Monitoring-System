import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Download, type Page } from '@playwright/test';
import { stat } from 'node:fs/promises';

const EXTERNAL_TARGET = process.env.PLAYWRIGHT_BASE_URL?.trim();
const EVENT_ID = process.env.E2E_EVENT_ID?.trim() || 'EVT-2407-0253';

type Role = 'viewer' | 'supervisor' | 'admin';

const usernames: Record<Role, string> = {
  viewer: process.env.E2E_VIEWER_USERNAME?.trim() || 'viewer',
  supervisor: process.env.E2E_SUPERVISOR_USERNAME?.trim() || 'supervisor',
  admin: process.env.E2E_ADMIN_USERNAME?.trim() || 'admin',
};

function passwordFor(role: Role): string {
  const roleSpecific = process.env[`E2E_${role.toUpperCase()}_PASSWORD`]?.trim();
  const shared = process.env.E2E_PASSWORD?.trim();
  const password = roleSpecific || shared;
  if (!password) {
    throw new Error(`Missing E2E_${role.toUpperCase()}_PASSWORD (or shared E2E_PASSWORD).`);
  }
  return password;
}

function observeBrowserHealth(page: Page): string[] {
  const issues: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') issues.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 500) issues.push(`http ${response.status()}: ${response.url()}`);
  });
  page.on('requestfailed', (request) => {
    if (!['document', 'xhr', 'fetch'].includes(request.resourceType())) return;
    const failure = request.failure()?.errorText ?? 'unknown';
    if (/ERR_ABORTED|NS_BINDING_ABORTED/i.test(failure)) return;
    issues.push(`request failed: ${request.method()} ${request.url()} - ${failure}`);
  });

  return issues;
}

function expectHealthyBrowser(issues: string[]): void {
  expect(issues, `Unexpected browser/runtime failures:\n${issues.join('\n')}`).toEqual([]);
}

async function expectDeploymentReady(page: Page): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('API & DB ready', { exact: true })).toBeVisible();
}

async function signIn(page: Page, role: Role): Promise<void> {
  await expectDeploymentReady(page);
  await page.getByLabel('Username', { exact: true }).fill(usernames[role]);
  await page.getByLabel('Password', { exact: true }).fill(passwordFor(role));
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await expect(page.getByText(role, { exact: true })).toBeVisible();
}

async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Sign out / }).click();
  await expect(page).toHaveURL(/\/login/);
}

async function expectNonEmptyDownload(downloadPromise: Promise<Download>, extension: RegExp): Promise<void> {
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(extension);
  const path = await download.path();
  expect(path).not.toBeNull();
  if (path) expect((await stat(path)).size).toBeGreaterThan(10);
}

test.describe('Codistan deployed browser acceptance', () => {
  test.skip(!EXTERNAL_TARGET, 'Set PLAYWRIGHT_BASE_URL to run deployed-environment acceptance tests.');

  test('deployment readiness is real and invalid credentials fail cleanly', async ({ page }) => {
    const issues = observeBrowserHealth(page);
    await expectDeploymentReady(page);
    await page.getByLabel('Username', { exact: true }).fill(usernames.supervisor);
    await page.getByLabel('Password', { exact: true }).fill('definitely-not-the-right-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('username or password is incorrect');
    await expect(page).toHaveURL(/\/login/);
    expectHealthyBrowser(issues);
  });

  test('protected routes redirect unauthenticated users to login', async ({ page }) => {
    const issues = observeBrowserHealth(page);
    await page.goto('/events', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Operational visibility for every inspection.' })).toBeVisible();
    expectHealthyBrowser(issues);
  });

  for (const role of ['viewer', 'supervisor', 'admin'] as const) {
    test(`${role} can authenticate through the deployed browser`, async ({ page }) => {
      const issues = observeBrowserHealth(page);
      await signIn(page, role);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/overview$/);
      await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
      expectHealthyBrowser(issues);
    });
  }

  test('viewer remains read-only on event review controls', async ({ page }) => {
    const issues = observeBrowserHealth(page);
    await signIn(page, 'viewer');
    await page.goto(`/events/${encodeURIComponent(EVENT_ID)}`);
    await expect(page.getByRole('heading', { name: EVENT_ID })).toBeVisible();
    await expect(page.getByText('Your role can view events but cannot change review status.')).toBeVisible();
    await expect(page.getByLabel('Supervisor remarks')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save review' })).toBeDisabled();
    expectHealthyBrowser(issues);
  });

  test('supervisor can navigate, search, filter, sort and use browser history', async ({ page }) => {
    const issues = observeBrowserHealth(page);
    await signIn(page, 'supervisor');

    await expect(page.getByLabel('Inspection key performance indicators')).toBeVisible();
    await page.getByRole('link', { name: 'Live Monitoring', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Live Monitoring', exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Events', exact: true }).click();
    await expect(page.getByRole('table')).toBeVisible();

    await page.getByPlaceholder('Search event ID, camera, zone or reason').fill(EVENT_ID);
    await expect(page).toHaveURL(new RegExp(`search=${EVENT_ID}`));
    await expect(page.getByText(EVENT_ID, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByLabel('Camera').selectOption('CAM-01');
    await expect(page).toHaveURL(/cameraId=CAM-01/);
    await page.getByRole('button', { name: /Outcome/ }).click();
    await expect(page).toHaveURL(/sortBy=outcome/);

    await page.goto(`/events/${encodeURIComponent(EVENT_ID)}`);
    await expect(page.getByRole('heading', { name: EVENT_ID })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/events/);
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`/events/${EVENT_ID}$`));

    expectHealthyBrowser(issues);
  });

  test('supervisor review persists after reload and a fresh login', async ({ page }) => {
    const issues = observeBrowserHealth(page);
    const marker = `Browser acceptance ${Date.now()}`;

    await signIn(page, 'supervisor');
    await page.goto(`/events/${encodeURIComponent(EVENT_ID)}`);
    await expect(page.getByRole('heading', { name: EVENT_ID })).toBeVisible();
    await page.getByLabel(/Dismiss/).check();
    await page.getByLabel('Supervisor remarks').fill(marker);
    await page.getByRole('button', { name: 'Save review' }).click();
    await expect(page.getByText('Review saved successfully.')).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('Supervisor remarks')).toHaveValue(marker);
    await expect(page.getByRole('heading', { name: 'Recorded review history' })).toBeVisible();

    await signOut(page);
    await signIn(page, 'supervisor');
    await page.goto(`/events/${encodeURIComponent(EVENT_ID)}`);
    await expect(page.getByLabel('Supervisor remarks')).toHaveValue(marker);

    expectHealthyBrowser(issues);
  });

  test('evidence and reports work through the deployed browser without leaking storage paths', async ({ page }) => {
    const issues = observeBrowserHealth(page);
    await signIn(page, 'supervisor');

    await page.goto(`/events/${encodeURIComponent(EVENT_ID)}`);
    await expect(page.getByRole('heading', { name: 'Inspection snapshot and clip' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recorded review history' })).toBeVisible();
    await expect(page.getByText(/filesystem|storage path|postgresql:\/\/|rtsp:\/\//i)).toHaveCount(0);

    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();

    const csvPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download CSV report' }).click();
    await expectNonEmptyDownload(csvPromise, /\.csv$/i);

    const pdfPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF report' }).click();
    await expectNonEmptyDownload(pdfPromise, /\.pdf$/i);

    expectHealthyBrowser(issues);
  });

  test('logout revokes browser access to protected screens', async ({ page }) => {
    const issues = observeBrowserHealth(page);
    await signIn(page, 'admin');
    await signOut(page);
    await page.goto('/health', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/);
    expectHealthyBrowser(issues);
  });

  test('core deployed screens have no critical accessibility violations', async ({ page }) => {
    const issues = observeBrowserHealth(page);
    await signIn(page, 'supervisor');

    const screens = [
      { path: '/overview', heading: 'Overview' },
      { path: '/live', heading: 'Live Monitoring' },
      { path: '/events', heading: 'Events' },
      { path: '/health', heading: 'System Health' },
      { path: '/reports', heading: 'Reports' },
    ] as const;

    for (const screen of screens) {
      await page.goto(screen.path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: screen.heading, exact: true })).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(
        results.violations.filter((violation) => violation.impact === 'critical'),
        `${screen.path} critical accessibility violations`,
      ).toEqual([]);
    }

    expectHealthyBrowser(issues);
  });
});
