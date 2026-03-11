import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Interface for user data
interface UserData {
  name: string;
  email: string;
  role: string;
  branch: string;
}

// Function to parse CSV file (semicolon-delimited)
function parseUserListCsv(filePath: string): UserData[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const users: UserData[] = [];

  // Skip header row (first line)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSV format: Name;Email;Role;Branch;ERP;QIMS Login;Lucatris;Remark
    const parts = line.split(';');

    if (parts.length >= 2) {
      const name = parts[0].trim();
      const email = parts[1].trim();
      const role = parts[2]?.trim() || '';
      const branch = parts[3]?.trim() || '';

      // Only add users with valid email addresses
      if (email && email.includes('@')) {
        users.push({
          name,
          email,
          role,
          branch
        });
      }
    }
  }

  return users;
}

test('Lucatris Login test with email list from CSV', async ({ page, context }) => {
  // Set longer timeout for testing all emails (30 minutes)
  test.setTimeout(1800000);

  // Read users from CSV file
  const userListPath = path.join(__dirname, '..', 'data', 'user qims regu.csv');
  const users = parseUserListCsv(userListPath);

  console.log(`\n========================================`);
  console.log(`Lucatris Login Test - Total users: ${users.length}`);
  console.log(`========================================\n`);

  const password = 'rui123';
  const successUsers: { name: string; email: string; role: string; branch: string }[] = [];
  const failedUsers: { name: string; email: string; role: string; branch: string; reason: string }[] = [];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`\n[${i + 1}/${users.length}] Testing: ${user.name} (${user.email})`);

    try {
      // Clear cookies before each login attempt
      try {
        await context.clearCookies();
      } catch {
        // Context might be closed, continue
      }

      // Navigate to login page
      await page.goto('https://lucatris.com/auth', { timeout: 60000 });

      // Clear storage
      try {
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
      } catch {
        // Storage not accessible, continue
      }

      // Fill login form
      await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
      await page.getByRole('textbox', { name: 'Password' }).fill(password);

      // Click sign in
      await page.getByRole('button', { name: 'Sign in' }).click();

      // Wait for navigation after login
      await page.waitForTimeout(3000);

      // Check current URL - if redirected away from auth, login succeeded
      const currentUrl = page.url();
      const isLoggedIn = !currentUrl.includes('/auth');

      if (isLoggedIn) {
        console.log(`  ✓ SUCCESS - Logged in successfully (redirected to: ${currentUrl})`);
        successUsers.push({ name: user.name, email: user.email, role: user.role, branch: user.branch });

        // Logout after successful login
        try {
          await page.waitForTimeout(1000);
          // Try to logout by clearing cookies
          await context.clearCookies();
        } catch {
          // Ignore logout errors
        }
      } else {
        // Still on auth page, capture the actual error message
        let reason = 'Login failed';

        try {
          // Try to find error message
          const errorText = page.locator('[class*="error"], [class*="alert"], [role="alert"]');
          if (await errorText.count() > 0) {
            reason = await errorText.first().innerText();
          } else {
            // Try other common error patterns
            const invalidError = page.getByText(/invalid|incorrect|wrong|error|gagal|not found/i);
            if (await invalidError.count() > 0) {
              reason = await invalidError.first().innerText();
            }
          }
        } catch {
          // Keep default reason
        }

        console.log(`  ✗ FAILED - ${reason}`);
        failedUsers.push({ name: user.name, email: user.email, role: user.role, branch: user.branch, reason });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ ERROR - ${errorMessage}`);
      failedUsers.push({ name: user.name, email: user.email, role: user.role, branch: user.branch, reason: errorMessage });

      // Check if browser closed
      if (errorMessage.includes('Target page, context or browser has been closed') ||
          errorMessage.includes('Protocol error')) {
        console.log('  Browser closed unexpectedly, saving partial results...');
        break;
      }
    }

    // Small delay between attempts
    try {
      await page.waitForTimeout(1000);
    } catch {
      console.log('  Browser closed, saving partial results...');
      break;
    }
  }

  // Save results to markdown file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsDir = path.join(__dirname, '..', 'test-results');

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const resultsFile = path.join(resultsDir, `lucatris-login-results-${timestamp}.md`);

  let mdContent = `# Lucatris Login Test Results\n\n`;
  mdContent += `**Date:** ${new Date().toISOString()}\n\n`;
  mdContent += `**Password Used:** ${password}\n\n`;
  mdContent += `## Summary\n\n`;
  mdContent += `| Metric | Count |\n`;
  mdContent += `|--------|-------|\n`;
  mdContent += `| Total Tested | ${successUsers.length + failedUsers.length} |\n`;
  mdContent += `| Successful | ${successUsers.length} |\n`;
  mdContent += `| Failed | ${failedUsers.length} |\n\n`;

  if (successUsers.length > 0) {
    mdContent += `## Successful Logins (${successUsers.length})\n\n`;
    mdContent += `| No | Name | Email | Role | Branch | Remark |\n`;
    mdContent += `|----|------|-------|------|--------|--------|\n`;
    successUsers.forEach((u, idx) => {
      mdContent += `| ${idx + 1} | ${u.name} | ${u.email} | ${u.role} | ${u.branch} | Login successful |\n`;
    });
    mdContent += `\n`;
  }

  if (failedUsers.length > 0) {
    mdContent += `## Failed Logins (${failedUsers.length})\n\n`;
    mdContent += `| No | Name | Email | Role | Branch | Remark |\n`;
    mdContent += `|----|------|-------|------|--------|--------|\n`;
    failedUsers.forEach((u, idx) => {
      mdContent += `| ${idx + 1} | ${u.name} | ${u.email} | ${u.role} | ${u.branch} | ${u.reason} |\n`;
    });
    mdContent += `\n`;
  }

  fs.writeFileSync(resultsFile, mdContent);

  // Print summary
  console.log(`\n========================================`);
  console.log(`TEST COMPLETE`);
  console.log(`========================================`);
  console.log(`Total tested: ${successUsers.length + failedUsers.length}`);
  console.log(`Successful: ${successUsers.length}`);
  console.log(`Failed: ${failedUsers.length}`);
  console.log(`Results saved to: ${resultsFile}`);
  console.log(`========================================\n`);

  // Assert at least some tests ran
  expect(successUsers.length + failedUsers.length).toBeGreaterThan(0);
});
