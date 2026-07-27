import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PASSWORD = process.env.E2E_PASSWORD ?? 'PTC-Demo-2026!';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Username').fill('supervisor');
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
}

test('supervisor can navigate the operational dashboard', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Live Monitoring' }).click();
  await expect(page).toHaveURL(/\/live$/);
  await page.getByRole('link', { name: 'Events' }).click();
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
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page).toHaveURL(/page=2/);
});

test('supervisor review persists across reload', async ({ page }) => {
  await signIn(page);
  await page.goto('/events?reviewStatus=unreviewed&page=1&pageSize=20&sortBy=timestamp&sortDirection=desc');
  await page.getByRole('link', { name: /Open EVT-/ }).first().click();
  await page.getByLabel(/Dismiss/).check();
  await page.getByLabel('Supervisor remarks').fill('Reviewed during automated browser test.');
  await page.getByRole('button', { name: 'Save review' }).click();
  await expect(page.getByText('Review saved successfully.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Supervisor remarks')).toHaveValue('Reviewed during automated browser test.');
});

test('core screens have no critical accessibility violations', async ({ page }) => {
  await signIn(page);
  for (const path of ['/overview', '/live', '/events', '/health', '/reports']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(
      results.violations.filter((violation) => violation.impact === 'critical'),
      `${path} critical accessibility violations`,
    ).toEqual([]);
  }
});
