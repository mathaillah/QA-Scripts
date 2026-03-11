import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Test login with email list from radiant-utama-emails.txt', async ({ page, context }) => {
  // Set test timeout to handle multiple login attempts
  test.setTimeout(1200000); // 600000=10 minutes

  // Read email list from file (use data directory for persistence)
  const emailFilePath = path.join(__dirname, '..', 'data', 'radiant-utama-emails.txt');
  const emailFileContent = fs.readFileSync(emailFilePath, 'utf-8');
  // Remove duplicates using Set
  let emails = [...new Set(emailFileContent.split('\n').filter(email => email.trim() !== '').map(e => e.trim()))];

  // Limit emails for testing (set TEST_LIMIT environment variable to limit, 0 = test all)
  const testLimit = parseInt(process.env.TEST_LIMIT || '0');
  const allEmails = [...emails];
  if (testLimit > 0 && testLimit < emails.length) {
    emails = emails.slice(0, testLimit);
    console.log(`\nLimited test to first ${testLimit} emails`);
  } else {
    console.log(`\nTesting all emails (set TEST_LIMIT=N to limit)`);
  }

  console.log(`\nTotal emails in file: ${allEmails.length}`);
  console.log(`Testing: ${emails.length} emails`);
  console.log('Password: rui123\n');

  const successEmails: string[] = [];
  const failedEmails: string[] = [];
  const password = 'rui123';

  // Test login for each email
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i].trim();
    console.log(`[${i + 1}/${emails.length}] Testing login for: ${email}`);

    try {
      // Clear cookies before each test
      await context.clearCookies();

      // Navigate to login page
      await page.goto('https://dev.lucatris.com/auth', { waitUntil: 'networkidle', timeout: 30000 });

      // Try to clear storage (might not be accessible before navigation)
      try {
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
      } catch (storageError) {
        // Storage not accessible, that's okay
      }

      // Fill in email
      const emailInput = page.locator('input[type="email"]').or(
        page.locator('input[name="email"]')
      ).first();
      await emailInput.fill(email, { timeout: 10000 });

      // Fill in password
      const passwordInput = page.locator('input[type="password"]').or(
        page.locator('input[name="password"]')
      ).first();
      await passwordInput.fill(password, { timeout: 10000 });

      // Click submit button
      const submitButton = page.locator('button[type="submit"]').or(
        page.locator('button:has-text("Login")').or(
          page.locator('button:has-text("Sign in")')
        )
      ).first();
      await submitButton.click({ timeout: 10000 });

      // Wait for response
      await page.waitForTimeout(3000);

      // Check if login was successful by looking for error messages or successful navigation
      const errorMessages = await page.locator('text=/invalid|incorrect|wrong|error|gagal/i').count();
      const currentUrl = page.url();

      if (errorMessages > 0 || currentUrl.includes('/auth')) {
        // Login failed - still on auth page or error message visible
        console.log(`  ❌ FAILED: ${email}`);
        failedEmails.push(email);
      } else {
        // Login successful - redirected away from auth page
        console.log(`  ✓ SUCCESS: ${email}`);
        successEmails.push(email);

        // Logout after successful login
        try {
          // Wait a bit to ensure page is fully loaded
          await page.waitForTimeout(2000);

          // Try to find user menu or profile button first
          const userMenu = page.locator('[class*="avatar"]').or(
            page.locator('[class*="profile"]').or(
              page.locator('[class*="user"]').or(
                page.locator('button:has-text("SP")')
              )
            )
          ).first();

          const userMenuCount = await userMenu.count();
          if (userMenuCount > 0) {
            await userMenu.click({ timeout: 5000 });
            await page.waitForTimeout(1000);
          }

          // Try to find and click logout button
          const logoutButton = page.locator('text=/logout|sign out|keluar/i').first();
          const logoutCount = await logoutButton.count();

          if (logoutCount > 0) {
            await logoutButton.click({ timeout: 5000 });
            await page.waitForTimeout(2000);
            console.log(`    Logged out successfully`);
          } else {
            console.log(`    Logout button not found, clearing session manually`);
            await context.clearCookies();
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`    Logout error: ${errorMessage}, clearing session manually`);
          try {
            await context.clearCookies();
          } catch {
            // Context might be closed, continue
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ❌ ERROR: ${email} - ${errorMessage}`);
      failedEmails.push(email);

      // Check if browser is still open, if not, break the loop
      if (errorMessage.includes('Target page, context or browser has been closed') ||
          errorMessage.includes('Protocol error')) {
        console.log('  Browser closed unexpectedly, saving partial results...');
        break;
      }
    }

    // Small delay between attempts (wrapped in try-catch for safety)
    try {
      await page.waitForTimeout(1000);
    } catch {
      console.log('  Browser closed, saving partial results...');
      break;
    }
  }

  // Generate report
  console.log('\n=== Login Test Report ===');
  console.log(`Total emails in file: ${allEmails.length}`);
  console.log(`Emails tested: ${emails.length}`);
  console.log(`Successful: ${successEmails.length}`);
  console.log(`Failed: ${failedEmails.length}`);

  // Save reports to files
  const outputDir = path.join(__dirname, '..', 'test-results');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save success emails
  const successFile = path.join(outputDir, 'login-success.txt');
  fs.writeFileSync(successFile, successEmails.join('\n'), 'utf-8');
  console.log(`\nSuccess emails saved to: ${successFile}`);

  // Save failed emails
  const failedFile = path.join(outputDir, 'login-failed.txt');
  fs.writeFileSync(failedFile, failedEmails.join('\n'), 'utf-8');
  console.log(`Failed emails saved to: ${failedFile}`);

  // Save detailed JSON report
  const reportFile = path.join(outputDir, 'login-test-report.json');
  const report = {
    testDate: new Date().toISOString(),
    totalTested: emails.length,
    successCount: successEmails.length,
    failedCount: failedEmails.length,
    successEmails: successEmails,
    failedEmails: failedEmails
  };
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Detailed report saved to: ${reportFile}`);

  // Test passes if we tested at least some emails
  expect(emails.length).toBeGreaterThan(0);
  expect(successEmails.length + failedEmails.length).toBeGreaterThan(0);
});
