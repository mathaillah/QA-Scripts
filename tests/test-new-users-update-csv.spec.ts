import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Interface for user data
interface UserData {
  rowIndex: number;
  name: string;
  email: string;
  role: string;
  branch: string;
}

// Function to parse CSV and get all data
function parseCsv(filePath: string): { lines: string[]; header: string } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const header = lines[0];
  return { lines, header };
}

// Function to get emails from CSV
function getEmailsFromCsv(filePath: string): Set<string> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const emails = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(';');
    if (parts.length >= 2) {
      const email = parts[1].trim().toLowerCase();
      if (email && email.includes('@')) {
        emails.add(email);
      }
    }
  }
  return emails;
}

// Function to find new users (in original but not in old)
function findNewUsers(originalPath: string, oldPath: string): UserData[] {
  const oldEmails = getEmailsFromCsv(oldPath);
  const originalContent = fs.readFileSync(originalPath, 'utf-8');
  const lines = originalContent.split('\n');

  const newUsers: UserData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(';');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const email = parts[1].trim();
      const role = parts[2]?.trim() || '';
      const branch = parts[3]?.trim() || '';

      // Only add if email exists and not in old file
      if (email && email.includes('@') && !oldEmails.has(email.toLowerCase())) {
        newUsers.push({
          rowIndex: i,
          name,
          email,
          role,
          branch
        });
      }
    }
  }

  return newUsers;
}

// Function to update CSV line
function updateCsvLine(line: string, qimsStatus: string, lucatrisStatus: string): string {
  const parts = line.split(';');
  while (parts.length < 8) {
    parts.push('');
  }
  parts[5] = qimsStatus;      // QIMS Login column (index 5)
  parts[6] = lucatrisStatus;  // Lucatris Login column (index 6)
  return parts.join(';');
}

test('Test NEW users and update CSV with date timestamp', async ({ page, context }) => {
  test.setTimeout(3600000); // 60 minutes

  const originalCsvPath = path.join(__dirname, '..', 'data', 'user qims regu.csv');
  const oldCsvPath = path.join(__dirname, '..', 'data', 'user qims regu-updated-qims-2026-01-27T07-43-19.csv');

  // Find new users
  const newUsers = findNewUsers(originalCsvPath, oldCsvPath);

  console.log(`\n========================================`);
  console.log(`Testing NEW Users Only`);
  console.log(`New users found: ${newUsers.length}`);
  console.log(`========================================\n`);

  if (newUsers.length === 0) {
    console.log('No new users to test!');
    expect(true).toBe(true);
    return;
  }

  // List new users
  newUsers.forEach((u, idx) => {
    console.log(`  ${idx + 1}. ${u.name} (${u.email}) - ${u.branch}`);
  });

  const password = 'rui123';

  // Results tracking
  const qimsSuccess: number[] = [];
  const qimsFailed: { user: UserData; reason: string }[] = [];
  const lucatrisSuccess: number[] = [];
  const lucatrisFailed: { user: UserData; reason: string }[] = [];

  // Test QIMS Login for new users
  console.log(`\n========================================`);
  console.log(`Testing QIMS Login...`);
  console.log(`========================================\n`);

  for (let i = 0; i < newUsers.length; i++) {
    const user = newUsers[i];
    console.log(`\n[QIMS ${i + 1}/${newUsers.length}] Testing: ${user.name} (${user.email})`);

    try {
      await context.clearCookies();
      await page.goto('http://5.223.61.214:3000/sign-in', { timeout: 60000 });

      await page.getByRole('textbox', { name: 'Email' }).click();
      await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
      await page.getByRole('textbox', { name: 'Password' }).click();
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      await page.waitForTimeout(5000);

      const currentUrl = page.url();
      const isLoggedIn = !currentUrl.includes('sign-in');

      if (isLoggedIn) {
        console.log(`  ✓ QIMS SUCCESS`);
        qimsSuccess.push(user.rowIndex);
        await context.clearCookies();
      } else {
        let reason = 'Login failed';
        try {
          const userEmailError = page.getByText(/User with email/i);
          if (await userEmailError.count() > 0) {
            reason = await userEmailError.first().innerText();
          }
        } catch {}
        console.log(`  ✗ QIMS FAILED - ${reason}`);
        qimsFailed.push({ user, reason });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ QIMS ERROR - ${errorMessage}`);
      qimsFailed.push({ user, reason: errorMessage });
    }

    await page.waitForTimeout(1000);
  }

  // Test Lucatris Login for new users
  console.log(`\n========================================`);
  console.log(`Testing Lucatris Login...`);
  console.log(`========================================\n`);

  for (let i = 0; i < newUsers.length; i++) {
    const user = newUsers[i];
    console.log(`\n[Lucatris ${i + 1}/${newUsers.length}] Testing: ${user.name} (${user.email})`);

    try {
      await context.clearCookies();
      await page.goto('https://lucatris.com/auth', { timeout: 60000 });

      try {
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
      } catch {}

      await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();

      await page.waitForTimeout(3000);

      const currentUrl = page.url();
      const isLoggedIn = !currentUrl.includes('/auth');

      if (isLoggedIn) {
        console.log(`  ✓ Lucatris SUCCESS`);
        lucatrisSuccess.push(user.rowIndex);
        await context.clearCookies();
      } else {
        let reason = 'Login failed';
        try {
          const errorText = page.locator('[class*="error"], [class*="alert"], [role="alert"]');
          if (await errorText.count() > 0) {
            reason = await errorText.first().innerText();
          }
        } catch {}
        console.log(`  ✗ Lucatris FAILED - ${reason}`);
        lucatrisFailed.push({ user, reason });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ Lucatris ERROR - ${errorMessage}`);
      lucatrisFailed.push({ user, reason: errorMessage });
    }

    await page.waitForTimeout(1000);
  }

  // Update original CSV file with results
  console.log(`\n========================================`);
  console.log(`Updating CSV file...`);
  console.log(`========================================`);

  const { lines } = parseCsv(originalCsvPath);
  const updatedLines = [...lines];

  for (const user of newUsers) {
    const qimsStatus = qimsSuccess.includes(user.rowIndex) ? 'YES' : '';
    const lucatrisStatus = lucatrisSuccess.includes(user.rowIndex) ? 'YES' : '';

    if (updatedLines[user.rowIndex]) {
      updatedLines[user.rowIndex] = updateCsvLine(updatedLines[user.rowIndex], qimsStatus, lucatrisStatus);
      console.log(`  Updated row ${user.rowIndex}: ${user.name} - QIMS=${qimsStatus || 'NO'}, Lucatris=${lucatrisStatus || 'NO'}`);
    }
  }

  // Generate timestamp for filename
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-MM-SS
  const timestamp = `${dateStr}_${timeStr}`;

  // Save updated CSV
  const dataDir = path.join(__dirname, '..', 'data');
  const updatedCsvPath = path.join(dataDir, `user qims regu-updated-${timestamp}.csv`);

  fs.writeFileSync(updatedCsvPath, updatedLines.join('\n'), 'utf-8');
  console.log(`\nUpdated CSV saved to: ${updatedCsvPath}`);

  // Save results to markdown
  const resultsDir = path.join(__dirname, '..', 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const resultsFile = path.join(resultsDir, `new-users-test-${timestamp}.md`);

  let mdContent = `# New Users Login Test Results\n\n`;
  mdContent += `**Date:** ${now.toISOString()}\n\n`;
  mdContent += `**Password Used:** ${password}\n\n`;
  mdContent += `**Updated CSV:** ${updatedCsvPath}\n\n`;

  mdContent += `## Summary\n\n`;
  mdContent += `| System | Successful | Failed | Total |\n`;
  mdContent += `|--------|------------|--------|-------|\n`;
  mdContent += `| QIMS | ${qimsSuccess.length} | ${qimsFailed.length} | ${newUsers.length} |\n`;
  mdContent += `| Lucatris | ${lucatrisSuccess.length} | ${lucatrisFailed.length} | ${newUsers.length} |\n\n`;

  mdContent += `## New Users Tested (${newUsers.length})\n\n`;
  mdContent += `| No | Name | Email | Branch | QIMS | Lucatris |\n`;
  mdContent += `|----|------|-------|--------|------|----------|\n`;
  newUsers.forEach((u, idx) => {
    const qims = qimsSuccess.includes(u.rowIndex) ? 'YES' : 'NO';
    const lucatris = lucatrisSuccess.includes(u.rowIndex) ? 'YES' : 'NO';
    mdContent += `| ${idx + 1} | ${u.name} | ${u.email} | ${u.branch} | ${qims} | ${lucatris} |\n`;
  });

  if (qimsFailed.length > 0) {
    mdContent += `\n## QIMS Failed Details\n\n`;
    mdContent += `| Name | Email | Reason |\n`;
    mdContent += `|------|-------|--------|\n`;
    qimsFailed.forEach(f => {
      mdContent += `| ${f.user.name} | ${f.user.email} | ${f.reason} |\n`;
    });
  }

  if (lucatrisFailed.length > 0) {
    mdContent += `\n## Lucatris Failed Details\n\n`;
    mdContent += `| Name | Email | Reason |\n`;
    mdContent += `|------|-------|--------|\n`;
    lucatrisFailed.forEach(f => {
      mdContent += `| ${f.user.name} | ${f.user.email} | ${f.reason} |\n`;
    });
  }

  fs.writeFileSync(resultsFile, mdContent);

  // Print summary
  console.log(`\n========================================`);
  console.log(`TEST COMPLETE`);
  console.log(`========================================`);
  console.log(`New users tested: ${newUsers.length}`);
  console.log(`QIMS: ${qimsSuccess.length} success, ${qimsFailed.length} failed`);
  console.log(`Lucatris: ${lucatrisSuccess.length} success, ${lucatrisFailed.length} failed`);
  console.log(`Updated CSV: ${updatedCsvPath}`);
  console.log(`Results: ${resultsFile}`);
  console.log(`========================================\n`);

  expect(newUsers.length).toBeGreaterThan(0);
});
