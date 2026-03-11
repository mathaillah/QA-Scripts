import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Extract all emails from Company User Management', async ({ page }) => {
  // Set test timeout to 5 minutes for processing multiple pages
  test.setTimeout(300000);
  // Visit login page
  await page.goto('https://dev.lucatris.com/auth');

  // Perform login - try different selectors
  const emailInput = page.locator('input[type="email"]').or(page.locator('input[name="email"]')).or(page.locator('input[placeholder*="email" i]')).first();
  await emailInput.fill('superadmin@example.com');

  const passwordInput = page.locator('input[type="password"]').or(page.locator('input[name="password"]')).first();
  await passwordInput.fill('ris123');

  const submitButton = page.locator('button[type="submit"]').or(page.locator('button:has-text("Login")')).or(page.locator('button:has-text("Sign in")')).first();
  await submitButton.click();

  // Wait for navigation after login with longer timeout
  await page.waitForLoadState('networkidle', { timeout: 60000 });

  // Take screenshot to debug
  await page.screenshot({ path: 'test-results/after-login.png' });

  // Click on "Company User" tab in the navigation bar
  await page.click('text=Company User');

  // Wait for Company User Management page to load
  await page.waitForLoadState('networkidle', { timeout: 60000 });

  // Take screenshot to debug
  await page.screenshot({ path: 'test-results/company-user-page.png' });

  // Get all email values from the Email column across all pages
  let emails: string[] = [];
  let emailCompanyPairs: Array<{email: string, company: string}> = [];
  let pageNumber = 1;

  // Loop through all pagination pages
  while (true) {
    console.log(`\nExtracting emails from page ${pageNumber}...`);

    // Get all emails and companies in bulk (faster)
    const emailTexts = await page.locator('table tbody tr td:nth-child(2)').allTextContents();
    const companyTexts = await page.locator('table tbody tr td:nth-child(3)').allTextContents();

    for (let i = 0; i < emailTexts.length; i++) {
      const emailText = emailTexts[i];
      const companyText = companyTexts[i] || '';

      if (emailText && emailText.trim()) {
        const email = emailText.trim();
        const company = companyText.trim();

        emails.push(email);
        emailCompanyPairs.push({ email, company });
      }
    }

    console.log(`Found ${emailTexts.length} emails on page ${pageNumber}`);

    // Check if we're on the last page by looking for disabled next button
    const disabledNext = await page.locator('li.page-item.disabled [aria-label="Next"]').count();
    if (disabledNext > 0) {
      console.log('Reached last page (Next button is disabled)');
      break;
    }

    // Try to find pagination with page numbers
    const nextPageNumber = page.locator(`button:has-text("${pageNumber + 1}")`).or(
      page.locator(`a:has-text("${pageNumber + 1}")`)
    );

    // Try to find active Next button
    const nextButton = page.locator('li.page-item:not(.disabled) [aria-label="Next"]').or(
      page.locator('button:has-text("Next"):not(:disabled)').or(
        page.locator('a:has-text("Next")')
      )
    );

    // Check if next page number exists
    const nextPageNumberCount = await nextPageNumber.count();
    if (nextPageNumberCount > 0) {
      await nextPageNumber.first().click();
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      pageNumber++;
      continue;
    }

    // Check if next button exists and is clickable
    const nextButtonCount = await nextButton.count();
    if (nextButtonCount > 0) {
      try {
        await nextButton.first().click({ timeout: 5000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        pageNumber++;
        continue;
      } catch (error) {
        console.log('Cannot click Next button, assuming last page reached');
        break;
      }
    }

    // No more pages
    console.log('No next button found, reached last page');
    break;
  }

  console.log('\n=== All Extracted Emails ===');
  emails.forEach((email, index) => {
    console.log(`${index + 1}. ${email}`);
  });
  console.log(`\nTotal emails extracted: ${emails.length}`);

  // Save emails to a file
  const outputDir = path.join(__dirname, '..', 'test-results');
  const outputFile = path.join(outputDir, 'company-user-emails.txt');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write emails to file (one per line)
  const emailContent = emails.join('\n');
  fs.writeFileSync(outputFile, emailContent, 'utf-8');
  console.log(`\nEmails saved to: ${outputFile}`);

  // Also save as JSON format
  const jsonOutputFile = path.join(outputDir, 'company-user-emails.json');
  const jsonContent = JSON.stringify({
    totalCount: emails.length,
    extractedAt: new Date().toISOString(),
    emails: emails
  }, null, 2);
  fs.writeFileSync(jsonOutputFile, jsonContent, 'utf-8');
  console.log(`Emails also saved as JSON to: ${jsonOutputFile}`);

  // Filter emails containing @radiant-utama.com AND company "Radiant Utama Interinsco (RUI)"
  const radiantEmailsWithCompany = emailCompanyPairs.filter(pair =>
    pair.email.includes('@radiant-utama.com') &&
    pair.company.includes('Radiant Utama Interinsco (RUI)')
  );

  const radiantEmails = radiantEmailsWithCompany.map(pair => pair.email);

  console.log(`\nFiltered ${radiantEmails.length} emails with:`);
  console.log(`  - Email domain: @radiant-utama.com`);
  console.log(`  - Company: Radiant Utama Interinsco (RUI)`);

  // Save filtered emails to separate file
  const radiantOutputFile = path.join(outputDir, 'radiant-utama-emails.txt');
  const radiantEmailContent = radiantEmails.join('\n');
  fs.writeFileSync(radiantOutputFile, radiantEmailContent, 'utf-8');
  console.log(`\nRadiant Utama filtered emails saved to: ${radiantOutputFile}`);

  // Also save detailed report with company info
  const radiantDetailedFile = path.join(outputDir, 'radiant-utama-emails-detailed.json');
  const radiantDetailedContent = JSON.stringify({
    totalCount: radiantEmails.length,
    extractedAt: new Date().toISOString(),
    filter: {
      emailDomain: '@radiant-utama.com',
      company: 'Radiant Utama Interinsco (RUI)'
    },
    users: radiantEmailsWithCompany
  }, null, 2);
  fs.writeFileSync(radiantDetailedFile, radiantDetailedContent, 'utf-8');
  console.log(`Detailed report saved to: ${radiantDetailedFile}`);

  // Also save to data directory for persistence across test runs
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dataRadiantFile = path.join(dataDir, 'radiant-utama-emails.txt');
  fs.writeFileSync(dataRadiantFile, radiantEmailContent, 'utf-8');
  console.log(`Radiant Utama emails also saved to data directory: ${dataRadiantFile}`);

  // Verify that we extracted at least one email
  expect(emails.length).toBeGreaterThan(0);
});
