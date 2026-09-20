import { test, expect } from '@playwright/test';

test.describe('Gaming Section', () => {
  test('gaming page loads', async ({ page }) => {
    await page.goto('/gaming');
    await expect(page).toHaveTitle(/Gaming/i);
  });

  test('gaming page has platform links', async ({ page }) => {
    await page.goto('/gaming');
    // Should have links to platform subpages in sidebar
    const sidebar = page.getByLabel('Docs sidebar');
    await expect(sidebar.getByRole('link', { name: /Xbox/i }).first()).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /PlayStation/i }).first()).toBeVisible();
  });
});

const writingLocales = [
  {
    locale: 'en',
    prefix: '',
    language: 'en-US',
    heading: 'Writing & Updates',
    monthly: 'Monthly Updates',
    notes: 'Gaming Notes',
    development: 'Game Development',
    notesEmpty: 'No gaming notes have been published yet.',
    developmentEmpty: 'No game development entries have been published yet.',
  },
  {
    locale: 'es',
    prefix: '/es',
    language: 'es-ES',
    heading: 'Artículos y Actualizaciones',
    monthly: 'Actualizaciones Mensuales',
    notes: 'Notas de Gaming',
    development: 'Desarrollo de Videojuegos',
    notesEmpty: 'Aún no se han publicado notas de gaming.',
    developmentEmpty: 'Aún no se han publicado artículos de desarrollo de videojuegos.',
  },
  {
    locale: 'pt',
    prefix: '/pt',
    language: 'pt-BR',
    heading: 'Artigos e Atualizações',
    monthly: 'Atualizações Mensais',
    notes: 'Notas de Gaming',
    development: 'Desenvolvimento de Jogos',
    notesEmpty: 'Nenhuma nota de gaming foi publicada ainda.',
    developmentEmpty: 'Nenhum artigo de desenvolvimento de jogos foi publicado ainda.',
  },
];

for (const translations of writingLocales) {
  test.describe(`Gaming writing (${translations.locale})`, () => {
    const sections = [
      { slug: 'gaming-notes', title: translations.notes, empty: translations.notesEmpty },
      { slug: 'game-development', title: translations.development, empty: translations.developmentEmpty },
    ];

    test('overview cards and sidebar link to writing and monthly updates in the current locale', async ({ page }) => {
      await page.goto(`${translations.prefix}/gaming`);
      const main = page.getByRole('main');
      await expect(main.getByRole('heading', { name: new RegExp(translations.heading), level: 2 })).toBeVisible();

      for (const section of [{ slug: 'monthly-updates', title: translations.monthly }, ...sections]) {
        const href = `${translations.prefix}/gaming/${section.slug}`;
        const card = main.getByRole('link').filter({
          has: page.getByRole('heading', { name: section.title, exact: true }),
        });
        await expect(card).toHaveAttribute('href', href);
        await expect(card).toBeVisible();

        const sidebarLink = page.locator('aside').getByRole('link', { name: new RegExp(section.title) });
        await expect(sidebarLink).toHaveAttribute('href', new RegExp(`^${href}/?$`));
        await expect(sidebarLink).toBeVisible();
      }

      await main.getByRole('link').filter({
        has: page.getByRole('heading', { name: translations.notes, exact: true }),
      }).click();
      await expect(page).toHaveURL(`${translations.prefix}/gaming/gaming-notes`);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(translations.notes);
    });

    for (const section of sections) {
      test(`${section.slug} has a localized landing page and honest empty state`, async ({ page }) => {
        const pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        const response = await page.goto(`${translations.prefix}/gaming/${section.slug}`);

        expect(response.status()).toBe(200);
        await expect(page).toHaveTitle(new RegExp(section.title));
        await expect(page.locator('html')).toHaveAttribute('lang', translations.language);
        await expect(page.getByRole('heading', { level: 1 })).toContainText(section.title);
        await expect(page.getByRole('main').getByText(section.empty, { exact: true })).toBeVisible();

        const activeLink = page.locator('aside').getByRole('link', { name: new RegExp(section.title) });
        await expect(activeLink).toHaveAttribute('aria-current', 'page');
        // Empty categories must not render cards for unrelated platform pages.
        await expect(page.getByRole('main').locator('section.row article')).toHaveCount(0);
        expect(pageErrors).toEqual([]);
      });
    }
  });
}
