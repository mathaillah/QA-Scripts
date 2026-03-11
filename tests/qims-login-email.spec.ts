import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Interface for user data
interface UserData {
  name: string;
  email: string;
  role: string;
}

// Function to parse markdown table from user-list.md
function parseUserList(filePath: string): UserData[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const users: UserData[] = [];

  // Find the User Data table and parse it
  let inUserDataTable = false;
  let headerPassed = false;

  for (const line of lines) {
    // Check if we're entering the User Data section
    if (line.includes('## User Data')) {
      inUserDataTable = true;
      continue;
    }

    // Check if we're leaving the User Data section
    if (inUserDataTable && line.startsWith('## ')) {
      inUserDataTable = false;
      continue;
    }

    // Skip non-table lines and header/separator rows
    if (!inUserDataTable || !line.startsWith('|')) {
      continue;
    }

    // Skip header and separator rows
    if (line.includes('| No |') || line.includes('|----')) {
      headerPassed = true;
      continue;
    }

    if (!headerPassed) continue;

    // Parse data row: | No | Name | Email | Role |
    const parts = line.split('|').map(p => p.trim()).filter(p => p !== '');

    if (parts.length >= 4) {
      const name = parts[1].trim();
      const email = parts[2].trim();
      const role = parts[3].trim();

      if (email && email.includes('@')) {
        users.push({
          name,
          email,
          role
        });
      }
    }
  }

  return users;
}

test('QIMS Login test with email list from user-list.md', async ({ page, context }) => {
  // Set longer timeout for testing all emails (30 minutes)
  test.setTimeout(1800000);
  // Read users from markdown file
  const userListPath = path.join(__dirname, '..', 'data', 'user-list.md');
  const users = parseUserList(userListPath);

  // Extract unique emails
  const emails = [...new Set(users.map(u => u.email))];

  console.log(`\n========================================`);
  console.log(`QIMS Login Test - Total emails: ${emails.length}`);
  console.log(`========================================\n`);

  const password = 'rui123';
  const successEmails: { email: string; name: string; role: string }[] = [];
  const failedEmails: { email: string; name: string; role: string; reason: string }[] = [];

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
      await page.goto('http://5.223.61.214:3000/sign-in', { timeout: 60000 });

      // Fill login form
      await page.getByRole('textbox', { name: 'Email' }).click();
      await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
      await page.getByRole('textbox', { name: 'Password' }).click();
      await page.getByRole('textbox', { name: 'Password' }).fill(password);

      // Click sign in
      await page.getByRole('button', { name: 'Sign In' }).click();

      // Wait for navigation after login
      await page.waitForTimeout(5000);

      // Check current URL - if redirected away from sign-in, login succeeded
      const currentUrl = page.url();
      const isLoggedIn = !currentUrl.includes('sign-in');

      if (isLoggedIn) {
        console.log(`  ✓ SUCCESS - Logged in successfully (redirected to: ${currentUrl})`);
        successEmails.push({ email: user.email, name: user.name, role: user.role });
      } else {
        // Still on sign-in page, capture the actual error message
        let reason = 'Login failed';

        try {
          // Try to find error message using getByText with partial match
          const userEmailError = page.getByText(/User with email/i);
          if (await userEmailError.count() > 0) {
            reason = await userEmailError.first().innerText();
          } else {
            // Check for password not match error
            const passwordError = page.getByText(/Password not match/i);
            if (await passwordError.count() > 0) {
              reason = await passwordError.first().innerText();
            } else {
              // Try other common error messages
              const invalidError = page.getByText(/invalid/i);
              if (await invalidError.count() > 0) {
                reason = await invalidError.first().innerText();
              } else {
                const incorrectError = page.getByText(/incorrect/i);
                if (await incorrectError.count() > 0) {
                  reason = await incorrectError.first().innerText();
                } else {
                  const notFoundError = page.getByText(/not found/i);
                  if (await notFoundError.count() > 0) {
                    reason = await notFoundError.first().innerText();
                  }
                }
              }
            }
          }
        } catch {
          // If error occurs during text search, keep default reason
        }

        console.log(`  ✗ FAILED - ${reason}`);
        failedEmails.push({ email: user.email, name: user.name, role: user.role, reason });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ ERROR - ${errorMessage}`);
      failedEmails.push({ email: user.email, name: user.name, role: user.role, reason: errorMessage });

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

  const resultsFile = path.join(resultsDir, `qims-login-results-${timestamp}.md`);

  let mdContent = `# QIMS Login Test Results\n\n`;
  mdContent += `**Date:** ${new Date().toISOString()}\n\n`;
  mdContent += `## Summary\n\n`;
  mdContent += `| Metric | Count |\n`;
  mdContent += `|--------|-------|\n`;
  mdContent += `| Total Tested | ${successEmails.length + failedEmails.length} |\n`;
  mdContent += `| Successful | ${successEmails.length} |\n`;
  mdContent += `| Failed | ${failedEmails.length} |\n\n`;

  if (successEmails.length > 0) {
    mdContent += `## Successful Logins (${successEmails.length})\n\n`;
    mdContent += `| No | Name | Email | Role |\n`;
    mdContent += `|----|------|-------|------|\n`;
    successEmails.forEach((u, idx) => {
      mdContent += `| ${idx + 1} | ${u.name} | ${u.email} | ${u.role} |\n`;
    });
    mdContent += `\n`;
  }

  if (failedEmails.length > 0) {
    mdContent += `## Failed Logins (${failedEmails.length})\n\n`;
    mdContent += `| No | Name | Email | Role | Reason |\n`;
    mdContent += `|----|------|-------|------|--------|\n`;
    failedEmails.forEach((u, idx) => {
      mdContent += `| ${idx + 1} | ${u.name} | ${u.email} | ${u.role} | ${u.reason} |\n`;
    });
    mdContent += `\n`;
  }

  fs.writeFileSync(resultsFile, mdContent);

  // Print summary
  console.log(`\n========================================`);
  console.log(`TEST COMPLETE`);
  console.log(`========================================`);
  console.log(`Total tested: ${successEmails.length + failedEmails.length}`);
  console.log(`Successful: ${successEmails.length}`);
  console.log(`Failed: ${failedEmails.length}`);
  console.log(`Results saved to: ${resultsFile}`);
  console.log(`========================================\n`);

  // Assert at least some tests ran
  expect(successEmails.length + failedEmails.length).toBeGreaterThan(0);
});
