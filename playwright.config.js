// Browser tests for Hexadek: npx playwright test (needs Node 18+; `nvm use` picks 24 from .nvmrc).
// Three engines in phone-sized windows: Chromium as an Android phone, WebKit (Safari's engine) as
// an iPhone, and Firefox. By default they test a local copy served from this folder; set BASE_URL to
// test the live site instead (npm run test:live).
const { defineConfig, devices } = require('@playwright/test');
const live = process.env.BASE_URL;

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 120000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  // Service workers are blocked, as they'd answer requests before the tests' own routes; tests/app.spec.js allows them.
  use: { baseURL: live || 'http://127.0.0.1:8123/', serviceWorkers: 'block' },
  webServer: live ? undefined : {
    command: 'python3 -m http.server 8123 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8123/index.html',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore', stderr: 'ignore',   // the server logs every file it serves
  },
  projects: [
    { name: 'android-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'iphone-safari', use: { ...devices['iPhone 14'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 412, height: 860 } } },
  ],
});
