import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the correct title', async ({ page }) => {
    // Check that the page title is correct
    await expect(page).toHaveTitle('Tailspin Toys - Crowdfunding your new favorite game!');
  });

  test('should display the main heading', async ({ page }) => {
    // Check that the main page heading is present
    await expect(page.getByRole('heading', { name: 'Welcome to Tailspin Toys', exact: true })).toBeVisible();
  });

  test('should display the site branding in header', async ({ page }) => {
    // Check that the site branding is present in the header (no longer an h1)
    await expect(page.getByText('Tailspin Toys').first()).toBeVisible();
  });

  test('should display the welcome message', async ({ page }) => {
    // Check that the welcome message is present using more specific locator
    await expect(page.getByText('Find your next game! And maybe even back one! Explore our collection!')).toBeVisible();
  });

  test('should expose labeled game filtering controls', async ({ page }) => {
    const filters = page.getByTestId('game-filters');

    await expect(filters).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search games' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Category' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible();
  });

  test('should filter games by category and reset the results', async ({ page }) => {
    const categoryFilter = page.getByRole('combobox', { name: 'Category' });
    const visibleCards = page.locator('[data-testid="game-card"]:visible');
    const initialCount = await visibleCards.count();

    await test.step('Filter by the Puzzle category', async () => {
      await categoryFilter.selectOption('Puzzle');
      await expect(visibleCards).not.toHaveCount(initialCount);
      await expect(page.getByTestId('game-results-status')).toHaveText(/Showing \d+ games?\./);
      await expect(visibleCards.first()).toBeVisible();
      await expect(visibleCards.first().getByTestId('game-category')).toHaveText('Puzzle');
    });

    await test.step('Clear the category filter', async () => {
      await page.getByRole('button', { name: 'Clear filters' }).click();
      await expect(categoryFilter).toHaveValue('');
      await expect(visibleCards).toHaveCount(initialCount);
      await expect(page.getByTestId('game-results-status')).toHaveText(new RegExp(`Showing ${initialCount} games?\\.`));
    });
  });

  test('should filter by text and announce when no games match', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search games' });
    const visibleCards = page.locator('[data-testid="game-card"]:visible');

    await test.step('Search for a specific game', async () => {
      await search.fill('DevOps Dominion');
      await expect(visibleCards).toHaveCount(1);
      await expect(visibleCards.first().getByTestId('game-title')).toHaveText('DevOps Dominion');
      await expect(page.getByTestId('game-results-status')).toHaveText('Showing 1 game.');
    });

    await test.step('Search for a game that does not exist', async () => {
      await search.fill('No matching game');
      await expect(visibleCards).toHaveCount(0);
      await expect(page.getByTestId('no-filter-results')).toBeVisible();
      await expect(page.getByTestId('game-results-status')).toHaveText('Showing 0 games.');
    });
  });

  test('should support keyboard access to filtering controls', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search games' });
    const categoryFilter = page.getByRole('combobox', { name: 'Category' });
    const reset = page.getByRole('button', { name: 'Clear filters' });

    await search.focus();
    await expect(search).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(categoryFilter).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(reset).toBeFocused();
  });
});
