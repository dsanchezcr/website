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
      await expect(ecards).toHaveAttribute('href', 'https://github.com/dsanchezcr/RonaldMcDonaldHouse');
      await expect(ecards).toContainText(locale.campaign);

      const processor = main.getByRole('link', { name: /SupportShield/ });
      await expect(processor).toBeVisible();
      await expect(processor).toHaveAttribute('href', 'https://github.com/dsanchezcr/isolated-file-processor');
      await expect(processor).toContainText(locale.workInProgress);
      await expect(processor).toContainText(locale.useCase);
    });

    test(`archived projects are grouped and expandable (${locale.prefix || 'en'})`, async ({ page }) => {
      await page.goto(`${locale.prefix}/projects`);
      const archive = page.getByRole('main').locator('details').filter({ hasText: locale.archiveSummary });
      const summary = archive.locator('summary');
      const projectPaths = [
        'contact-form',
        'load-testing',
        'previous-roles/sample-delivery-service',
        'previous-roles/rpsls',
        'previous-roles/tailwind-traders',
        'previous-roles/smarthotel360',
        'previous-roles/thundercloud',
      ];

      await expect(summary).toBeVisible();
      await expect(archive).toHaveJSProperty('open', false);
      await expect(archive.locator('a[href*="/projects/"]')).toHaveCount(projectPaths.length);
      for (const path of projectPaths) {
        await expect(archive.locator(`a[href="${locale.prefix}/projects/${path}"]`)).toBeHidden();
      }

      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(archive).toHaveJSProperty('open', true);
      await expect(archive.getByRole('heading', { name: locale.personalProjects, exact: true })).toBeVisible();
      await expect(archive.getByRole('heading', { name: locale.previousRoles, exact: true })).toBeVisible();
      for (const path of projectPaths) {
        await expect(archive.locator(`a[href="${locale.prefix}/projects/${path}"]`)).toBeVisible();
      }

      await summary.click();
      await expect(archive).toHaveJSProperty('open', false);
      await expect(archive.getByRole('heading', { name: locale.previousRoles, exact: true })).toBeHidden();
    });
  }

  test('individual project page loads', async ({ page }) => {
    await page.goto('/projects/secret-santa');
    await expect(page).toHaveTitle(/Secret Santa/i);
    await expect(page.locator('h1')).toContainText('Secret Santa');
  });

  test('projects sidebar navigation works', async ({ page }) => {
    await page.goto('/projects');
    // Docusaurus docs sidebar with project links
    const sidebar = page.locator('[class*="sidebar"]').filter({ hasText: 'Secret Santa' });
    await expect(sidebar.first()).toBeVisible();
  });
});
