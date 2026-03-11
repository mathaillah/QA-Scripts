import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface UserData {
  rowIndex: number;
  name: string;
  email: string;
  role: string;
  branch: string;
  erp: string;
  qimsLogin: string;
  lucatrisLogin: string;
  remark: string;
}

interface ParseResult {
  users: UserData[];
  skippedUsers: UserData[];
  lines: string[];
}

function parseCsv(filePath: string): ParseResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const users: UserData[] = [];
  const skippedUsers: UserData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(';');
    const name = parts[0]?.trim() || '';
    const email = parts[1]?.trim() || '';
    const role = parts[2]?.trim() || '';
    const branch = parts[3]?.trim() || '';
    const erp = parts[4]?.trim() || '';
    const qimsLogin = parts[5]?.trim() || '';
    const lucatrisLogin = parts[6]?.trim() || '';
    const remark = parts[7]?.trim() || '';

    const userData = { rowIndex: i, name, email, role, branch, erp, qimsLogin, lucatrisLogin, remark };

    if (email && email.includes('@')) {
      users.push(userData);
    } else if (name) {
      skippedUsers.push(userData);
    }
  }

  return { users, skippedUsers, lines };
}

function updateCsvLine(line: string, qimsStatus: string, lucatrisStatus: string): string {
  const parts = line.split(';');
  while (parts.length < 8) {
    parts.push('');
  }
  if (qimsStatus) parts[5] = qimsStatus;
  if (lucatrisStatus) parts[6] = lucatrisStatus;
  return parts.join(';');
}

test('Retest ALL users login on QIMS and Lucatris', async ({ page, context }) => {
  test.setTimeout(14400000); // 4 hours

  const csvPath = path.join(__dirname, '..', 'data', 'user-qims-regu-updated-2026-01-28.csv');
  const { users, skippedUsers, lines } = parseCsv(csvPath);

  console.log(`\n========================================`);
  console.log(`RETEST ALL USERS LOGIN`);
  console.log(`========================================`);
  console.log(`Total users in CSV: ${users.length + skippedUsers.length}`);
  console.log(`Users with email (to test): ${users.length}`);
  console.log(`Users without email (skipped): ${skippedUsers.length}`);
  console.log(`========================================\n`);

  const password = 'rui123';

  const qimsResults: Map<number, string> = new Map();
  const lucatrisResults: Map<number, string> = new Map();

  // Test QIMS Login
  console.log(`\n========== QIMS LOGIN TEST ==========\n`);

  let qimsSuccess = 0;
  let qimsFailed = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    // Skip users without email
    if (!user.email) continue;

    process.stdout.write(`[QIMS ${i + 1}/${users.length}] ${user.name.substring(0, 25).padEnd(25)} `);

    try {
      await context.clearCookies();
      await page.goto('http://5.223.61.214:3000/sign-in', { timeout: 30000, waitUntil: 'domcontentloaded' });

      await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      if (!currentUrl.includes('sign-in')) {
        console.log(`✓ YES`);
        qimsResults.set(user.rowIndex, 'YES');
        qimsSuccess++;
      } else {
        console.log(`✗ NO`);
        qimsResults.set(user.rowIndex, '');
        qimsFailed++;
      }
    } catch (error) {
      console.log(`✗ ERROR`);
      qimsResults.set(user.rowIndex, '');
      qimsFailed++;
    }
  }

  console.log(`\nQIMS Summary: ${qimsSuccess} success, ${qimsFailed} failed\n`);

  // Test Lucatris Login
  console.log(`\n========== LUCATRIS LOGIN TEST ==========\n`);

  let lucatrisSuccess = 0;
  let lucatrisFailed = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    // Skip users without email
    if (!user.email) continue;

    process.stdout.write(`[Lucatris ${i + 1}/${users.length}] ${user.name.substring(0, 25).padEnd(25)} `);

    try {
      await context.clearCookies();
      await page.goto('https://lucatris.com/auth', { timeout: 30000, waitUntil: 'domcontentloaded' });

      try {
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
      } catch {}

      await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();

      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      if (!currentUrl.includes('/auth')) {
        console.log(`✓ YES`);
        lucatrisResults.set(user.rowIndex, 'YES');
        lucatrisSuccess++;
      } else {
        console.log(`✗ NO`);
        lucatrisResults.set(user.rowIndex, '');
        lucatrisFailed++;
      }
    } catch (error) {
      console.log(`✗ ERROR`);
      lucatrisResults.set(user.rowIndex, '');
      lucatrisFailed++;
    }
  }

  console.log(`\nLucatris Summary: ${lucatrisSuccess} success, ${lucatrisFailed} failed\n`);

  // Update CSV
  console.log(`\n========== UPDATING CSV ==========\n`);

  const updatedLines = [...lines];
  for (const user of users) {
    const qims = qimsResults.get(user.rowIndex) || user.qimsLogin;
    const lucatris = lucatrisResults.get(user.rowIndex) || user.lucatrisLogin;
    if (updatedLines[user.rowIndex]) {
      updatedLines[user.rowIndex] = updateCsvLine(updatedLines[user.rowIndex], qims, lucatris);
    }
  }

  const now = new Date();
  const timestamp = `${now.toISOString().slice(0, 10)}_${now.toTimeString().slice(0, 8).replace(/:/g, '-')}`;

  const dataDir = path.join(__dirname, '..', 'data');
  const updatedCsvPath = path.join(dataDir, `user-qims-regu-retested-${timestamp}.csv`);
  fs.writeFileSync(updatedCsvPath, updatedLines.join('\n'), 'utf-8');

  // Save results report
  const resultsDir = path.join(__dirname, '..', 'test-results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const resultsFile = path.join(resultsDir, `retest-all-users-${timestamp}.md`);

  let md = `# Retest All Users Login Results\n\n`;
  md += `**Date:** ${now.toISOString()}\n\n`;
  md += `**Password:** rui123\n\n`;
  md += `## Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Users in CSV | ${users.length + skippedUsers.length} |\n`;
  md += `| Users Tested | ${users.length} |\n`;
  md += `| Users Skipped (No Email) | ${skippedUsers.length} |\n\n`;
  md += `## Login Test Results\n\n`;
  md += `| System | Success | Failed | Total Tested |\n`;
  md += `|--------|---------|--------|-------|\n`;
  md += `| QIMS | ${qimsSuccess} | ${qimsFailed} | ${users.length} |\n`;
  md += `| Lucatris | ${lucatrisSuccess} | ${lucatrisFailed} | ${users.length} |\n\n`;

  // Group by branch (tested users)
  const branches = new Map<string, { total: number; qims: number; lucatris: number; skipped: number }>();
  for (const user of users) {
    const branch = user.branch || 'Unknown';
    if (!branches.has(branch)) {
      branches.set(branch, { total: 0, qims: 0, lucatris: 0, skipped: 0 });
    }
    const b = branches.get(branch)!;
    b.total++;
    if (qimsResults.get(user.rowIndex) === 'YES') b.qims++;
    if (lucatrisResults.get(user.rowIndex) === 'YES') b.lucatris++;
  }

  // Add skipped users to branch stats
  for (const user of skippedUsers) {
    const branch = user.branch || 'Unknown';
    if (!branches.has(branch)) {
      branches.set(branch, { total: 0, qims: 0, lucatris: 0, skipped: 0 });
    }
    branches.get(branch)!.skipped++;
  }

  md += `## Results by Branch\n\n`;
  md += `| Branch | Tested | Skipped | QIMS Success | Lucatris Success |\n`;
  md += `|--------|--------|---------|--------------|------------------|\n`;
  for (const [branch, stats] of branches) {
    md += `| ${branch} | ${stats.total} | ${stats.skipped} | ${stats.qims} | ${stats.lucatris} |\n`;
  }
  md += `\n`;

  // Failed users list
  const qimsFails = users.filter(u => qimsResults.get(u.rowIndex) !== 'YES');
  const lucatrisFails = users.filter(u => lucatrisResults.get(u.rowIndex) !== 'YES');

  if (qimsFails.length > 0) {
    md += `## QIMS Failed (${qimsFails.length})\n\n`;
    md += `| No | Name | Email | Branch |\n`;
    md += `|----|------|-------|--------|\n`;
    qimsFails.forEach((u, idx) => {
      md += `| ${idx + 1} | ${u.name} | ${u.email} | ${u.branch} |\n`;
    });
    md += `\n`;
  }

  if (lucatrisFails.length > 0) {
    md += `## Lucatris Failed (${lucatrisFails.length})\n\n`;
    md += `| No | Name | Email | Branch |\n`;
    md += `|----|------|-------|--------|\n`;
    lucatrisFails.forEach((u, idx) => {
      md += `| ${idx + 1} | ${u.name} | ${u.email} | ${u.branch} |\n`;
    });
    md += `\n`;
  }

  // Skipped users (no email)
  if (skippedUsers.length > 0) {
    md += `## Skipped Users - No Email (${skippedUsers.length})\n\n`;
    md += `| No | Name | Role | Branch | Remark |\n`;
    md += `|----|------|------|--------|--------|\n`;
    skippedUsers.forEach((u, idx) => {
      md += `| ${idx + 1} | ${u.name} | ${u.role} | ${u.branch} | ${u.remark} |\n`;
    });
    md += `\n`;
  }

  fs.writeFileSync(resultsFile, md);

  console.log(`\n========================================`);
  console.log(`RETEST COMPLETE`);
  console.log(`========================================`);
  console.log(`Total in CSV: ${users.length + skippedUsers.length}`);
  console.log(`Tested: ${users.length} | Skipped (no email): ${skippedUsers.length}`);
  console.log(`----------------------------------------`);
  console.log(`QIMS: ${qimsSuccess} success, ${qimsFailed} failed`);
  console.log(`Lucatris: ${lucatrisSuccess} success, ${lucatrisFailed} failed`);
  console.log(`----------------------------------------`);
  console.log(`CSV: ${updatedCsvPath}`);
  console.log(`Results: ${resultsFile}`);
  console.log(`========================================\n`);

  expect(users.length).toBeGreaterThan(0);
});
