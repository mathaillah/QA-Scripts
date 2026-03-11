import { test, expect } from '@playwright/test';

test('Get email flow - Login and retrieve Company User emails', async ({ page }) => {
  // Navigate to auth page
  await page.goto('https://dev.lucatris.com/auth', { waitUntil: 'domcontentloaded' });
  console.log('Navigated to auth page');

  // Login with provided credentials
  const email = 'superadmin@example.com';
  const password = 'ris123';

  // Find and fill email input field
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.fill(email);
  console.log('Filled email field');

  // Find and fill password input field
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(password);
  console.log('Filled password field');

  // Click login button
  const loginButton = page.locator('button[type="submit"]').first();
  await loginButton.click();
  console.log('Clicked login button');

  // Wait for navigation after login
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => console.log('Dashboard URL not reached, checking page'));
  await page.waitForLoadState('networkidle');
  console.log('Login completed');

  // Navigate to Company User menu (use the main navbar link)
  const companyUserMenu = page.locator('a[href="/superAds?tab=user"]').first();
  await companyUserMenu.click();
  console.log('Clicked Company User menu');

  // Wait for the Company User page to load
  await page.waitForLoadState('networkidle');
  console.log('Company User page loaded');

  // Collect all emails from all pages
  const allEmails = [];
  let currentPage = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    console.log(`Processing page ${currentPage}`);

    // Get all email values from the current page table
    let emailRows = await page.locator('table tbody tr').count();
    console.log(`Found ${emailRows} rows on page ${currentPage}`);

    // Extract email text from rows
    for (let i = 1; i <= emailRows; i++) {
      // Try to find email in any column (look for @ symbol)
      const cells = await page.locator(`table tbody tr:nth-child(${i}) td`).allTextContents();
      for (const cell of cells) {
        if (cell.includes('@')) {
          allEmails.push(cell.trim());
          break;
        }
      }
    }

    // Check if there's a next page button and click it
    const nextButton = page.locator('button:has-text("Next"), a:has-text("Next"), [aria-label*="next" i], [aria-label*="Next" i]').first();
    const isNextDisabled = await nextButton.evaluate((el: HTMLElement) => {
      return el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
    }).catch(() => true);

    if (isNextDisabled) {
      hasNextPage = false;
      console.log('No more pages to navigate');
    } else {
      await nextButton.click();
      await page.waitForLoadState('networkidle');
      currentPage++;
    }
  }

  // Log all emails for verification
  console.log('Retrieved emails from all pages in Company User Management:');
  allEmails.forEach((emailValue, index) => {
    console.log(`${index + 1}. ${emailValue}`);
  });

  console.log(`\nTotal emails found: ${allEmails.length}`);

  // Assert that we have at least one email
  expect(allEmails.length).toBeGreaterThan(0);
});
