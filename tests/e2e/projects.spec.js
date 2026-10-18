import { test, expect } from '@playwright/test';

test.describe('Projects Section', () => {
  test('projects page loads', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveTitle(/Projects/i);
  });

  test('projects page has project links', async ({ page }) => {
    await page.goto('/projects');
    const main = page.getByRole('main');
    await expect(main.getByRole('link', { name: /Secret Santa/i }).first()).toBeVisible();
    await expect(main.getByRole('link', { name: /Issue Importer/i }).first()).toBeVisible();
    await expect(main.getByRole('link', { name: /Colones Exchange Rate/i }).first()).toBeVisible();
  });

  for (const locale of [
    {
      prefix: '',
      campaign: 'internal Microsoft Give campaign',
      workInProgress: 'Work in progress',
      useCase: 'support workflows',
      archiveSummary: 'Explore archived projects',
      personalProjects: 'Personal Projects',
      previousRoles: 'Projects from Previous Roles',
    },
    {
      prefix: '/es',
      campaign: 'campaña interna de Microsoft Give',
      workInProgress: 'En desarrollo',
      useCase: 'flujos de soporte',
      archiveSummary: 'Explorar proyectos archivados',
      personalProjects: 'Proyectos Personales',
      previousRoles: 'Proyectos de Roles Anteriores',
    },
    {
      prefix: '/pt',
      campaign: 'campanha interna do Microsoft Give',
      workInProgress: 'Em desenvolvimento',
      useCase: 'fluxos de suporte',
      archiveSummary: 'Explorar projetos arquivados',
      personalProjects: 'Projetos Pessoais',
      previousRoles: 'Projetos de Funções Anteriores',
    },
  ]) {
    test(`new projects show campaign and work-in-progress context (${locale.prefix || 'en'})`, async ({ page }) => {
      await page.goto(`${locale.prefix}/projects`);
      const main = page.getByRole('main');
      const ecards = main.getByRole('link', { name: /Ronald McDonald House/ });
      await expect(ecards).toBeVisible();
      await expect(ecards).toHaveAttribute('href', `${locale.prefix}/projects/ronald-mcdonald-house`);
      await expect(ecards).toContainText(locale.campaign);

      const processor = main.getByRole('link', { name: /SupportShield/ });
      await expect(processor).toBeVisible();
      await expect(processor).toHaveAttribute('href', `${locale.prefix}/projects/isolated-file-processor`);
      await expect(processor).toContainText(locale.workInProgress);
      await expect(processor).toContainText(locale.useCase);
    });

    test(`project detail pages and sidebar navigation work (${locale.prefix || 'en'})`, async ({ page }) => {
      await page.goto(`${locale.prefix}/projects`);
      const main = page.getByRole('main');
      await main.getByRole('link', { name: /Ronald McDonald House/ }).click();
      await expect(page).toHaveURL(new RegExp(`${locale.prefix}/projects/ronald-mcdonald-house$`));
      await expect(page).toHaveTitle(/Ronald McDonald House/);
      await expect(main.getByRole('heading', { level: 1 })).toContainText('Ronald McDonald House');
      await expect(main).toContainText(locale.campaign);
      await expect(main.locator('a[href="https://github.com/dsanchezcr/RonaldMcDonaldHouse"]')).toBeVisible();

      const sidebar = page.locator('.theme-doc-sidebar-container');
      const processorLink = sidebar.locator(`a[href="${locale.prefix}/projects/isolated-file-processor"]`);
      await expect(processorLink).toBeVisible();
      for (const removedPage of ['secret-santa', 'load-testing', 'contact-form']) {
        await expect(page.locator(`a[href="${locale.prefix}/projects/${removedPage}"]`)).toHaveCount(0);
      }
      await processorLink.click();
      await expect(page).toHaveURL(new RegExp(`${locale.prefix}/projects/isolated-file-processor$`));
      await expect(main.getByRole('heading', { level: 1 })).toContainText('SupportShield');
      await expect(main).toContainText(locale.workInProgress);
      await expect(main).toContainText(locale.useCase);
      await expect(main.locator('a[href="https://github.com/dsanchezcr/isolated-file-processor"]')).toBeVisible();
    });

    test(`archived projects are grouped and expanded by default (${locale.prefix || 'en'})`, async ({ page }) => {
      await page.goto(`${locale.prefix}/projects`);
      const archive = page.getByRole('main').locator('details').filter({ hasText: locale.archiveSummary });
      const summary = archive.locator('summary');
      const projectLinks = [
        'https://github.com/dsanchezcr/secretsanta',
        'https://github.com/dsanchezcr/ContactFormWithAzure',
        'https://github.com/dsanchezcr/LoadTestingDemo',
        `${locale.prefix}/projects/previous-roles/sample-delivery-service`,
        `${locale.prefix}/projects/previous-roles/rpsls`,
        `${locale.prefix}/projects/previous-roles/tailwind-traders`,
        `${locale.prefix}/projects/previous-roles/smarthotel360`,
        `${locale.prefix}/projects/previous-roles/thundercloud`,
      ];

      await expect(summary).toBeVisible();
      await expect(archive).toHaveJSProperty('open', true);
      await expect(archive.locator('a[href*="/projects/"], a[href^="https://github.com/dsanchezcr/"]')).toHaveCount(projectLinks.length);
      await expect(archive.getByRole('heading', { name: locale.personalProjects, exact: true })).toBeVisible();
      await expect(archive.getByRole('heading', { name: locale.previousRoles, exact: true })).toBeVisible();
      const personalProjects = archive.getByRole('heading', { name: locale.personalProjects, exact: true }).locator('+ div');
      await expect(personalProjects.getByRole('link', { name: /Secret Santa/i })).toContainText('Archived');
      for (const href of projectLinks) {
        await expect(archive.locator(`a[href="${href}"]`)).toBeVisible();
      }

      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(archive).toHaveJSProperty('open', false);
      for (const href of projectLinks) {
        await expect(archive.locator(`a[href="${href}"]`)).toBeHidden();
      }

      await summary.click();
      await expect(archive).toHaveJSProperty('open', true);
      for (const href of projectLinks) {
        await expect(archive.locator(`a[href="${href}"]`)).toBeVisible();
      }
    });
  }
});
