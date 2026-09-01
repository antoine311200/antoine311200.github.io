// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/** End-to-end tests for the Paper Radar app at /#/paper-search. */
module.exports = defineConfig({
    testDir: './e2e',
    timeout: 30000,
    expect: { timeout: 7000 },
    fullyParallel: false,        // one dev server, and the tests share IndexedDB
    workers: 1,
    reporter: [['list']],
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'retain-on-failure',
        actionTimeout: 8000,
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: 'BROWSER=none npm start',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 180000,
    },
});
