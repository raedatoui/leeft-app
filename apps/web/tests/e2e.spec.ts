import { expect, test } from '@playwright/test';

// Smoke coverage for the v2 UI (now the only UI, served at the root routes).
const ROUTES = [
    { path: '/', name: 'Workout log' },
    { path: '/stats', name: 'Stats' },
    { path: '/monthly', name: 'Monthly' },
    { path: '/cycles', name: 'Cycles' },
    { path: '/exercises', name: 'Exercises' },
    { path: '/cardio', name: 'Cardio' },
];

test.describe('v2 app', () => {
    for (const { path, name } of ROUTES) {
        test(`renders the v2 shell on ${name} (${path})`, async ({ page }) => {
            await page.goto(path);
            await expect(page.locator('.shell')).toBeVisible();
            await expect(page.locator('.nav .brand')).toContainText('LEEFT');
            // The static nav has exactly the 6 v2 sections and no v1↔v2 toggle.
            await expect(page.locator('.nav-links a')).toHaveCount(6);
        });
    }

    test('workout log toggles between Month and Daily views', async ({ page }) => {
        await page.goto('/');
        const viewSeg = page.locator('.seg[aria-label="View mode"]');
        await expect(viewSeg).toBeVisible();

        const monthBtn = viewSeg.getByRole('button', { name: 'Month' });
        const dailyBtn = viewSeg.getByRole('button', { name: 'Daily' });

        await monthBtn.click();
        await expect(monthBtn).toHaveClass(/active/);
        await expect(page.locator('.month-cal')).toBeVisible();

        await dailyBtn.click();
        await expect(dailyBtn).toHaveClass(/active/);
        await expect(page.locator('.month-cal')).toHaveCount(0);
    });

    test('exercises library filters and drills into a detail page', async ({ page }) => {
        await page.goto('/exercises');

        const cells = page.locator('.exercise-cell');
        await expect(cells.first()).toBeVisible();

        // Search narrows the grid, then restores it.
        const search = page.getByPlaceholder('Search exercises');
        await search.fill('zzzznomatchzzzz');
        await expect(cells).toHaveCount(0);
        await search.fill('');
        await expect(cells.first()).toBeVisible();

        await cells.first().click();
        await expect(page).toHaveURL(/\/exercises\/[^/]+$/);
        await expect(page.locator('.shell')).toBeVisible();
    });

    test('cycles list drills into a cycle detail page', async ({ page }) => {
        await page.goto('/cycles');

        const cards = page.locator('.cycle-card');
        await expect(cards.first()).toBeVisible();

        await cards.first().click();
        await expect(page).toHaveURL(/\/cycles\/[^/]+$/);
        await expect(page.locator('.shell')).toBeVisible();
    });
});
