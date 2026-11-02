// The installable app: the manifest and its icons, and play without a connection once the page has
// been opened. Service workers can only be tested in Chromium.
const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'allow' });

test('manifest and icons load', async ({ page, request, baseURL }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const m = await (await request.get(new URL(href, baseURL).href)).json();
  expect(m).toMatchObject({ name: 'Hexadek', display: 'standalone', start_url: './' });
  expect(m.icons.map(i => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(m.icons.some(i => i.purpose === 'maskable')).toBe(true);
  for (const src of [...m.icons.map(i => i.src), 'icons/apple-touch-icon.png']) {
    const res = await request.get(new URL(src, new URL(href, baseURL)).href);
    expect(res.ok(), src).toBe(true);
    expect(res.headers()['content-type']).toContain('image/png');
  }
});

test('link previews point at a real image', async ({ page, request }) => {
  await page.goto('./');
  const og = async p => page.locator(`meta[property="og:${p}"]`).getAttribute('content');
  expect(await og('title')).toContain('Hexadek');
  const img = new URL(await og('image')).pathname.replace(/^\/hexadek\//, '');   // the local copy of the same file
  const res = await request.get(img);
  expect(res.ok()).toBe(true);
  expect(res.headers()['content-type']).toContain('image/png');
});

test('plays offline once opened', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'service workers are only testable in Chromium');
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();   // now the service worker answers for the page
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#mode')).toHaveText(/^Level 1/);
  expect(await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('600 16px Lexend'); })).toBe(true);
  expect(await page.evaluate(() => typeof THEMES)).toBe('object');   // themes.js came from the cache
  await context.setOffline(false);
});
