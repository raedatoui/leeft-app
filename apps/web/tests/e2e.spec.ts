import { test } from '@playwright/test';

test.describe('Leeft App Screenshots', () => {
    test('take screenshots of main pages', async ({ page }) => {
        // 1. Home
        console.log('Navigating to Home...');
        await page.goto('/');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'screenshots/01-home.png', fullPage: true });

        // 1a. Home - View Details (Toggle mini-mode)
        console.log('Toggling Mini Mode...');
        const miniModeSwitch = page.locator('#mini-mode');
        if ((await miniModeSwitch.count()) > 0) {
            await miniModeSwitch.click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'screenshots/01a-home-details.png', fullPage: true });
        }

        // 1b. Home - View Warmup Sets (Toggle warmup-mode)
        console.log('Toggling Warmup Mode...');
        const warmupModeSwitch = page.locator('#warmup-mode');
        if ((await warmupModeSwitch.count()) > 0) {
            await warmupModeSwitch.click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'screenshots/01b-home-warmup.png', fullPage: true });
        }

        // 1c. Home - Edit Mode (Pencil icon)
        console.log('Entering Edit Mode...');
        const pencilButton = page.locator('button:has(svg.lucide-pencil)').first();
        if ((await pencilButton.count()) > 0) {
            await pencilButton.click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'screenshots/01c-home-edit-mode.png', fullPage: true });

            // Exit edit mode
            const closeEditButton = page.locator('button:has(svg.lucide-x)').first();
            if ((await closeEditButton.count()) > 0) {
                await closeEditButton.click();
                await page.waitForTimeout(500);
            }
        }

        // 2. Analysis
        console.log('Navigating to Analysis...');
        await page.goto('/analysis');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'screenshots/02-analysis.png', fullPage: true });

        // 3. Cycles
        console.log('Navigating to Cycles...');
        await page.goto('/cycles');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'screenshots/03-cycles.png', fullPage: true });

        // 3a. Cycles - Filter by Type (Strength, Hypertrophy, Break, Maintenance)
        const cycleTypes = ['Strength', 'Hypertrophy', 'Break', 'Maintenance'];

        for (const type of cycleTypes) {
            console.log(`Processing Cycle Type: ${type}...`);

            if (type === 'Strength') {
                const yearHeader = page.locator('h2.text-3xl');
                if ((await yearHeader.innerText()) === '2025') {
                    console.log('Navigating to 2024...');
                    const prevYearBtn = page.locator('button:has(svg.lucide-chevron-left)');
                    await prevYearBtn.click();
                    await page.waitForTimeout(1000);
                }

                const filterButton = page.locator(`button:has-text("${type}")`);
                if ((await filterButton.count()) > 0) {
                    await filterButton.click();
                    await page.waitForTimeout(1000);
                    await page.screenshot({ path: 'screenshots/03-cycles-strength-2024.png', fullPage: true });

                    console.log('Selecting first cycle in Jan 2024...');
                    const cycleCards = page.locator('.grid > div');
                    const count = await cycleCards.count();
                    let clicked = false;
                    for (let i = 0; i < count; ++i) {
                        const card = cycleCards.nth(i);
                        const text = await card.innerText();
                        if (text.includes('Jan')) {
                            console.log('Found Jan cycle, clicking...');
                            await card.click();
                            clicked = true;
                            break;
                        }
                    }

                    if (!clicked && count > 0) {
                        console.log('No "Jan" cycle found, clicking the first available cycle instead...');
                        await cycleCards.first().click();
                    }

                    await page.waitForTimeout(2000);
                    await page.screenshot({ path: 'screenshots/03-cycles-strength-2024-detail.png', fullPage: true });

                    // Muscle Group Clicks
                    console.log('Clicking through muscle groups...');
                    const muscleGroupBadges = page.locator(
                        'div.flex.flex-wrap.flex-row.gap-3 div[role="button"], div.flex.flex-wrap.flex-row.gap-3 div.cursor-pointer'
                    );
                    const badgeCount = await muscleGroupBadges.count();
                    console.log(`Found ${badgeCount} muscle group badges`);

                    // Click up to 3 muscle groups
                    for (let i = 0; i < Math.min(3, badgeCount); i++) {
                        const badge = muscleGroupBadges.nth(i);
                        const badgeText = await badge.innerText();
                        const groupName = badgeText.split('\n')[0].trim().toLowerCase().replace(/\s+/g, '-');
                        console.log(`Clicking muscle group: ${badgeText}`);
                        await badge.click();
                        await page.waitForTimeout(1000);
                        await page.screenshot({ path: `screenshots/04-cycle-detail-muscle-${groupName}.png`, fullPage: true });
                    }

                    const closeButton = page.locator('button:has(svg.lucide-x)').first();
                    if ((await closeButton.count()) > 0) {
                        await closeButton.click();
                        await page.waitForTimeout(1000);
                    }
                }

                console.log('Returning to 2025...');
                const nextYearBtn = page.locator('button:has(svg.lucide-chevron-right)');
                await nextYearBtn.click();
                await page.waitForTimeout(1000);

                const allButton = page.locator('button:has-text("All")');
                await allButton.click();
                await page.waitForTimeout(500);
            } else {
                const filterButton = page.locator(`button:has-text("${type}")`);
                if ((await filterButton.count()) > 0) {
                    await filterButton.click();
                    await page.waitForTimeout(1000);
                    await page.screenshot({ path: `screenshots/03-cycles-${type.toLowerCase()}.png`, fullPage: true });
                }
            }
        }

        const allButton = page.locator('button:has-text("All")');
        if ((await allButton.count()) > 0) {
            await allButton.click();
            await page.waitForTimeout(500);
        }

        console.log('Navigating to Exercises...');
        await page.goto('/exercises');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'screenshots/05-exercises.png', fullPage: true });

        console.log('Navigating to Exercise Detail (1)...');
        await page.goto('/exercises/1');
        await page.waitForTimeout(2000);

        const chart = page.locator('.highcharts-container, .highcharts-root, canvas').first();
        if ((await chart.count()) > 0) {
            console.log('Hovering over chart...');
            await chart.hover();
            await page.waitForTimeout(1000);
        }

        await page.screenshot({ path: 'screenshots/06-exercise-detail.png', fullPage: true });
    });
});
