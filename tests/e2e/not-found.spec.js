import { test, expect } from '@playwright/test';

const bestKey = 'dsanchezcr.404-memory.best.v1';
const locales = [
  { locale: 'en', prefix: '', title: 'Lost page. Found a game.', start: 'Start game', home: 'Back to home' },
  { locale: 'es', prefix: '/es', title: 'Página perdida. Juego encontrado.', start: 'Empezar a jugar', home: 'Volver al inicio' },
  { locale: 'pt', prefix: '/pt', title: 'Página perdida. Jogo encontrado.', start: 'Começar a jogar', home: 'Voltar ao início' },
];

for (const { locale, prefix, title, start, home } of locales) {
  test(`missing URLs and generated 404 documents support ${locale}`, async ({ page }) => {
    for (const path of [`${prefix}/missing-memory-game-test`, `${prefix}/404.html`]) {
      await page.goto(path);
      const main = page.getByRole('main');
      await expect(main).toHaveAttribute('lang', locale);
      await expect(main.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
      await expect(main.getByRole('link', { name: home })).toHaveAttribute('href', `${prefix}/`);
      const cards = main.getByRole('group').getByRole('button');
      await expect(cards).toHaveCount(12);
      await expect(cards.first()).toBeDisabled();
      await main.getByRole('button', { name: new RegExp(start) }).click();
      await expect(cards.first()).toBeFocused();
      await cards.first().press('Enter');
      await expect(cards.first()).not.toHaveText('?');
      await main.getByRole('link', { name: home }).click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/$`));
      await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
      await expect(page.locator('html')).toHaveAttribute('lang', new RegExp(`^${locale}(?:-|$)`));
    }
    await page.goto(`${prefix}/missing-memory-game-test`);
    await page.getByRole('main').getByRole('link').filter({ hasText: /blog/ }).click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/blog/?$`));
    await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
  });
}

test('a keyboard-played round saves its score across reload and supports replay', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/missing-memory-game-test');
  await page.getByRole('button', { name: /Start game/ }).focus();
  await page.keyboard.press('Enter');
  const cards = page.getByRole('group', { name: 'Memory game cards' }).getByRole('button');
  await expect(cards.first()).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await expect(cards.nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /Restart/ }).press('Enter');

  const positions = new Map();
  for (let index = 0; index < 12; index += 1) {
    await cards.nth(index).press('Enter');
    const symbol = await cards.nth(index).locator('span').first().textContent();
    positions.set(symbol, [...(positions.get(symbol) || []), index]);
  }
  expect(positions.size).toBe(6);
  for (const indices of positions.values()) {
    expect(indices).toHaveLength(2);
    if (await cards.nth(indices[0]).getAttribute('aria-disabled') === 'true') continue;
    await cards.nth(indices[0]).press('Enter');
    await cards.nth(indices[1]).press('Space');
  }
  await expect(page.getByRole('status')).toContainText('Reboot complete!');
  const replay = page.getByRole('button', { name: /Play again/ });
  await expect(replay).toBeFocused();
  const score = await page.locator('dl > div').filter({ has: page.getByText('Score', { exact: true }) }).locator('dd').textContent();
  expect(Number(score)).toBeGreaterThanOrEqual(600);
  expect(Number(score)).toBeLessThanOrEqual(975);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), bestKey)).toBe(score);
  await replay.press('Enter');
  await expect(cards.first()).toBeFocused();
  await expect(cards.first()).toHaveText('?');
  await page.reload();
  await expect(page.locator('dl > div').filter({ has: page.getByText('Personal best', { exact: true }) }).locator('dd')).toHaveText(score);
  expect(errors).toEqual([]);
});

test.describe('mobile 404', () => {
  test.use({ viewport: { width: 320, height: 740 }, hasTouch: true, reducedMotion: 'reduce' });

  test('fits a narrow screen and supports touch in both themes', async ({ page }) => {
    await page.goto('/es/missing-memory-game-test');
    await page.getByRole('button', { name: /Empezar a jugar/ }).tap();
    const cards = page.getByRole('group').getByRole('button');
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const box = await cards.first().boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await cards.first().tap();
    await expect(cards.first()).not.toHaveText('?');
    await cards.nth(1).tap();
    await expect(page.locator('dl > div').filter({ has: page.getByText('Intentos', { exact: true }) }).locator('dd')).toHaveText('1');
  });
});
