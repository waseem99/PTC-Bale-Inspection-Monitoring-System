import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const PASSWORD = process.env.E2E_PASSWORD ?? 'PTC-Demo-2026!';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Username', { exact: true }).fill('supervisor');
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
}

test('supervisor can navigate the operational dashboard', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Live Monitoring', exact: true }).click();
  await expect(page).toHaveURL(/\/live$/);
  await page.getByRole('link', { name: 'Events', exact: true }).click();
  await expect(page).toHaveURL(/\/events/);
  await expect(page.getByRole('table')).toBeVisible();
});

test('filters and pagination are encoded in URL', async ({ page }) => {
  await signIn(page);
  await page.goto('/events');
  await page.getByLabel('Outcome').selectOption('missed');
  await expect(page).toHaveURL(/outcome=missed/);
  await page.getByLabel('Rows').selectOption('10');
  await expect(page).toHaveURL(/pageSize=10/);
  const nextPage = page.getByRole('button', { name: 'Next page' });
  await expect(nextPage).toBeEnabled();
  await nextPage.click();
  await expect(page).toHaveURL(/page=2/);
});

test('supervisor review persists across reload', async ({ page }) => {
  await signIn(page);
  await page.goto('/events/EVT-2407-0253');
  await expect(page.getByRole('heading', { name: 'EVT-2407-0253' })).toBeVisible();
  await page.getByLabel(/Dismiss/).check();
  await page.getByLabel('Supervisor remarks').fill('Reviewed during automated browser test.');
  await page.getByRole('button', { name: 'Save review' }).click();
  await expect(page.getByText('Review saved successfully.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Supervisor remarks')).toHaveValue('Reviewed during automated browser test.');
});

test('event detail exposes the protected evidence and audit sections', async ({ page }) => {
  await signIn(page);
  await page.goto('/events/EVT-2407-0253');
  await expect(page.getByRole('heading', { name: 'Inspection snapshot and clip' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recorded review history' })).toBeVisible();
  await expect(page.getByText(/filesystem|storage path/i)).toHaveCount(0);
});

test('reports provide authenticated CSV and PDF downloads', async ({ page }) => {
  await signIn(page);
  await page.goto('/reports');

  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV report' }).click();
  await expect((await csvDownload).suggestedFilename()).toMatch(/\.csv$/);

  const pdfDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF report' }).click();
  await expect((await pdfDownload).suggestedFilename()).toMatch(/\.pdf$/);
});

test('core screens have no critical accessibility violations', async ({ page }) => {
  await signIn(page);
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
});
