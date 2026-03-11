import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Interface for user data with row index for CSV update
interface UserData {
  rowIndex: number;
  name: string;
  email: string;
  role: string;
  branch: string;
}

// Function to parse CSV file and track row indices
function parseUserListCsv(filePath: string): { users: UserData[]; lines: string[]; header: string } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const header = lines[0];

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
          rowIndex: i,
          name,
          email,
          role,
          branch
        });
      }
    }
  }

  return { users, lines, header };
}

// Function to update CSV line with QIMS Login status
function updateCsvLine(line: string, qimsStatus: string): string {
  const parts = line.split(';');
  // Ensure we have at least 6 columns (index 5 is QIMS Login)
  while (parts.length < 8) {
    parts.push('');
  }
  parts[5] = qimsStatus; // Update QIMS Login column (index 5)
  return parts.join(';');
}

test('QIMS Login test and update CSV', async ({ page, context }) => {
  // Set longer timeout for testing all emails (60 minutes)
  test.setTimeout(3600000);

  // Read users from updated CSV file
  const userListPath = path.join(__dirname, '..', 'data', 'user qims regu-updated-2026-01-27T07-17-41.csv');
  const { users, lines } = parseUserListCsv(userListPath);

  console.log(`\n========================================`);
  console.log(`QIMS Login Test & CSV Update`);
  console.log(`Total users to test: ${users.length}`);
  console.log(`========================================\n`);

  const password = 'rui123';
  const successUsers: { name: string; email: string; role: string; branch: string }[] = [];
  const failedUsers: { name: string; email: string; role: string; branch: string; reason: string }[] = [];

  // Track which rows to update
  const successRowIndices: number[] = [];

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

      // Navigate to QIMS login page
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
        successUsers.push({ name: user.name, email: user.email, role: user.role, branch: user.branch });
        successRowIndices.push(user.rowIndex);

        // Clear cookies after successful login
        try {
          await context.clearCookies();
        } catch {
          // Ignore errors
        }
      } else {
        // Still on sign-in page, capture the actual error message
        let reason = 'Login failed';

        try {
          const userEmailError = page.getByText(/User with email/i);
          if (await userEmailError.count() > 0) {
            reason = await userEmailError.first().innerText();
          } else {
            const passwordError = page.getByText(/Password not match/i);
            if (await passwordError.count() > 0) {
              reason = await passwordError.first().innerText();
            } else {
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
          // Keep default reason
        }

        console.log(`  ✗ FAILED - ${reason}`);
        failedUsers.push({ name: user.name, email: user.email, role: user.role, branch: user.branch, reason });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ ERROR - ${errorMessage}`);
      failedUsers.push({ name: user.name, email: user.email, role: user.role, branch: user.branch, reason: errorMessage });

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

  // Update CSV file with successful logins
  console.log(`\n========================================`);
  console.log(`Updating CSV file...`);
  console.log(`========================================`);

  const updatedLines = [...lines];
  for (const rowIndex of successRowIndices) {
    if (updatedLines[rowIndex]) {
      updatedLines[rowIndex] = updateCsvLine(updatedLines[rowIndex], 'YES');
      console.log(`  Updated row ${rowIndex}: QIMS Login = YES`);
    }
  }

  // Save updated CSV
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dataDir = path.join(__dirname, '..', 'data');
  const updatedCsvPath = path.join(dataDir, `user qims regu-updated-qims-${timestamp}.csv`);

  fs.writeFileSync(updatedCsvPath, updatedLines.join('\n'), 'utf-8');
  console.log(`\nUpdated CSV saved to: ${updatedCsvPath}`);

  // Also save results to markdown file
  const resultsDir = path.join(__dirname, '..', 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const resultsFile = path.join(resultsDir, `qims-login-csv-update-${timestamp}.md`);

  let mdContent = `# QIMS Login Test Results (CSV Update)\n\n`;
  mdContent += `**Date:** ${new Date().toISOString()}\n\n`;
  mdContent += `**Password Used:** ${password}\n\n`;
  mdContent += `**Updated CSV:** ${updatedCsvPath}\n\n`;
  mdContent += `## Summary\n\n`;
  mdContent += `| Metric | Count |\n`;
  mdContent += `|--------|-------|\n`;
  mdContent += `| Total Tested | ${successUsers.length + failedUsers.length} |\n`;
  mdContent += `| Successful (QIMS Login = YES) | ${successUsers.length} |\n`;
  mdContent += `| Failed | ${failedUsers.length} |\n\n`;

  if (successUsers.length > 0) {
    mdContent += `## Successful Logins - Updated to YES (${successUsers.length})\n\n`;
    mdContent += `| No | Name | Email | Role | Branch |\n`;
    mdContent += `|----|------|-------|------|--------|\n`;
    successUsers.forEach((u, idx) => {
      mdContent += `| ${idx + 1} | ${u.name} | ${u.email} | ${u.role} | ${u.branch} |\n`;
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
  console.log(`Successful (CSV updated): ${successUsers.length}`);
  console.log(`Failed: ${failedUsers.length}`);
  console.log(`Updated CSV: ${updatedCsvPath}`);
  console.log(`Results: ${resultsFile}`);
  console.log(`========================================\n`);

  expect(successUsers.length + failedUsers.length).toBeGreaterThan(0);
});
