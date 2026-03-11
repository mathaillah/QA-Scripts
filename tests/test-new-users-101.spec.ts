import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface UserData {
  rowIndex: number;
  name: string;
  email: string;
  role: string;
  branch: string;
}

function parseCsv(filePath: string): { users: UserData[]; lines: string[] } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const users: UserData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(';');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const email = parts[1].trim();
      const role = parts[2]?.trim() || '';
      const branch = parts[3]?.trim() || '';

      if (email && email.includes('@')) {
        users.push({ rowIndex: i, name, email, role, branch });
      }
    }
  }

  return { users, lines };
}

function updateCsvLine(line: string, qimsStatus: string, lucatrisStatus: string): string {
  const parts = line.split(';');
  while (parts.length < 8) {
    parts.push('');
  }
  parts[5] = qimsStatus;
  parts[6] = lucatrisStatus;
  return parts.join(';');
}

test('Test 101 NEW users on QIMS and Lucatris', async ({ page, context }) => {
  test.setTimeout(7200000); // 2 hours

  const csvPath = path.join(__dirname, '..', 'data', 'new-users-only-2026-01-27.csv');
  const { users, lines } = parseCsv(csvPath);

  console.log(`\n========================================`);
  console.log(`Testing NEW Users: ${users.length}`);
  console.log(`========================================\n`);

  const password = 'rui123';
  const qimsSuccess: number[] = [];
  const qimsFailed: { user: UserData; reason: string }[] = [];
  const lucatrisSuccess: number[] = [];
  const lucatrisFailed: { user: UserData; reason: string }[] = [];

  // Test QIMS Login
  console.log(`\n========== QIMS LOGIN TEST ==========\n`);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`[QIMS ${i + 1}/${users.length}] ${user.name} (${user.email})`);

    try {
      await context.clearCookies();
      await page.goto('http://5.223.61.214:3000/sign-in', { timeout: 60000 });

      await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      await page.waitForTimeout(5000);

      const currentUrl = page.url();
      if (!currentUrl.includes('sign-in')) {
        console.log(`  ✓ SUCCESS`);
        qimsSuccess.push(user.rowIndex);
        await context.clearCookies();
      } else {
        let reason = 'Login failed';
        try {
          const err = page.getByText(/User with email|Password not match|invalid|not found/i);
          if (await err.count() > 0) reason = await err.first().innerText();
        } catch {}
        console.log(`  ✗ FAILED - ${reason}`);
        qimsFailed.push({ user, reason });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ ERROR - ${msg}`);
      qimsFailed.push({ user, reason: msg });
    }

    await page.waitForTimeout(500);
  }

  // Test Lucatris Login
  console.log(`\n========== LUCATRIS LOGIN TEST ==========\n`);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`[Lucatris ${i + 1}/${users.length}] ${user.name} (${user.email})`);

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
      if (!currentUrl.includes('/auth')) {
        console.log(`  ✓ SUCCESS`);
        lucatrisSuccess.push(user.rowIndex);
        await context.clearCookies();
      } else {
        let reason = 'Login failed';
        try {
          const err = page.locator('[class*="error"], [class*="alert"], [role="alert"]');
          if (await err.count() > 0) reason = await err.first().innerText();
        } catch {}
        console.log(`  ✗ FAILED - ${reason}`);
        lucatrisFailed.push({ user, reason });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ ERROR - ${msg}`);
      lucatrisFailed.push({ user, reason: msg });
    }

    await page.waitForTimeout(500);
  }

  // Update CSV
  console.log(`\n========== UPDATING CSV ==========\n`);

  const updatedLines = [...lines];
  for (const user of users) {
    const qims = qimsSuccess.includes(user.rowIndex) ? 'YES' : '';
    const lucatris = lucatrisSuccess.includes(user.rowIndex) ? 'YES' : '';
    if (updatedLines[user.rowIndex]) {
      updatedLines[user.rowIndex] = updateCsvLine(updatedLines[user.rowIndex], qims, lucatris);
    }
  }

  const now = new Date();
  const timestamp = `${now.toISOString().slice(0, 10)}_${now.toTimeString().slice(0, 8).replace(/:/g, '-')}`;

  const dataDir = path.join(__dirname, '..', 'data');
  const updatedCsvPath = path.join(dataDir, `new-users-tested-${timestamp}.csv`);
  fs.writeFileSync(updatedCsvPath, updatedLines.join('\n'), 'utf-8');

  // Save results markdown
  const resultsDir = path.join(__dirname, '..', 'test-results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const resultsFile = path.join(resultsDir, `new-users-101-test-${timestamp}.md`);

  let md = `# New Users (101) Login Test Results\n\n`;
  md += `**Date:** ${now.toISOString()}\n\n`;
  md += `**Password:** rui123\n\n`;
  md += `## Summary\n\n`;
  md += `| System | Success | Failed | Total |\n`;
  md += `|--------|---------|--------|-------|\n`;
  md += `| QIMS | ${qimsSuccess.length} | ${qimsFailed.length} | ${users.length} |\n`;
  md += `| Lucatris | ${lucatrisSuccess.length} | ${lucatrisFailed.length} | ${users.length} |\n\n`;

  md += `## All Users Results\n\n`;
  md += `| No | Name | Email | Branch | QIMS | Lucatris |\n`;
  md += `|----|------|-------|--------|------|----------|\n`;
  users.forEach((u, idx) => {
    const q = qimsSuccess.includes(u.rowIndex) ? 'YES' : 'NO';
    const l = lucatrisSuccess.includes(u.rowIndex) ? 'YES' : 'NO';
    md += `| ${idx + 1} | ${u.name} | ${u.email} | ${u.branch} | ${q} | ${l} |\n`;
  });

  if (qimsFailed.length > 0) {
    md += `\n## QIMS Failed (${qimsFailed.length})\n\n`;
    md += `| Name | Email | Reason |\n`;
    md += `|------|-------|--------|\n`;
    qimsFailed.forEach(f => {
      md += `| ${f.user.name} | ${f.user.email} | ${f.reason} |\n`;
    });
  }

  if (lucatrisFailed.length > 0) {
    md += `\n## Lucatris Failed (${lucatrisFailed.length})\n\n`;
    md += `| Name | Email | Reason |\n`;
    md += `|------|-------|--------|\n`;
    lucatrisFailed.forEach(f => {
      md += `| ${f.user.name} | ${f.user.email} | ${f.reason} |\n`;
    });
  }

  fs.writeFileSync(resultsFile, md);

  console.log(`\n========================================`);
  console.log(`TEST COMPLETE`);
  console.log(`========================================`);
  console.log(`QIMS: ${qimsSuccess.length} success, ${qimsFailed.length} failed`);
  console.log(`Lucatris: ${lucatrisSuccess.length} success, ${lucatrisFailed.length} failed`);
  console.log(`CSV: ${updatedCsvPath}`);
  console.log(`Results: ${resultsFile}`);
  console.log(`========================================\n`);

  expect(users.length).toBeGreaterThan(0);
});
