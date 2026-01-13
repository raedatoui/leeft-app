import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: '.',
    testMatch: 'tests/e2e.spec.ts',
    // Max out global test timeout to 5 minutes
    timeout: 300 * 1000,
    expect: {
        // Increase expectation timeout to 60 seconds
        timeout: 60 * 1000,
    },
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        // Increase action and navigation timeouts
        actionTimeout: 60 * 1000,
        navigationTimeout: 300 * 1000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        // Wait up to 5 minutes for the dev server to start
        timeout: 300 * 1000,
    },
});
