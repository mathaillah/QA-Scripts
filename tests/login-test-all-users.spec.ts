import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface UserData {
  name: string;
  email: string;
  role: string;
  branch: string;
  erp: string;
  qimsLogin: string;
  lucatrisLogin: string;
  remark: string;
}

interface TestResult {
  name: string;
  email: string;
  role: string;
  branch: string;
  qims: string;
  lucatris: string;
}

function parseCsv(filePath: string): { users: UserData[]; skippedUsers: UserData[] } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  const users: UserData[] = [];
  const skippedUsers: UserData[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(';');
    const user: UserData = {
      name: parts[0]?.trim() || '',
      email: parts[1]?.trim() || '',
      role: parts[2]?.trim() || '',
      branch: parts[3]?.trim() || '',
      erp: parts[4]?.trim() || '',
      qimsLogin: parts[5]?.trim() || '',
      lucatrisLogin: parts[6]?.trim() || '',
      remark: parts[7]?.trim() || '',
    };

    if (user.name) {
      if (user.email) {
        users.push(user);
      } else {
        skippedUsers.push(user);
      }
    }
  }

  return { users, skippedUsers };
}

test('Login test all users from CSV', async ({ page, context }) => {
  test.setTimeout(1800000); // 30 minutes

  const csvPath = path.join(__dirname, '..', 'data', 'user-qims-regu-updated-2026-01-28.csv');
  const { users, skippedUsers } = parseCsv(csvPath);

  const password = 'rui123';
  const results: TestResult[] = [];

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;

  console.log(`\n========================================`);
  console.log(`LOGIN TEST ALL USERS`);
  console.log(`========================================`);
  console.log(`Total users with email: ${users.length}`);
  console.log(`Skipped (no email): ${skippedUsers.length}`);
  console.log(`========================================\n`);

  // Test each user
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const result: TestResult = {
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch,
      qims: '',
      lucatris: '',
    };

    process.stdout.write(`[${i + 1}/${users.length}] ${user.name.substring(0, 30).padEnd(30)} `);

    // Test QIMS
    try {
      await context.clearCookies();
      await page.goto('http://5.223.61.214:3000/sign-in', { timeout: 30000, waitUntil: 'domcontentloaded' });

      await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      await page.waitForTimeout(2000);

      const qimsUrl = page.url();
      if (!qimsUrl.includes('sign-in')) {
        result.qims = 'YES';
        process.stdout.write(`QIMS:YES `);
      } else {
        result.qims = 'NO';
        process.stdout.write(`QIMS:NO `);
      }
    } catch {
      result.qims = 'ERROR';
      process.stdout.write(`QIMS:ERR `);
    }

    // Test Lucatris
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

      const lucatrisUrl = page.url();
      if (!lucatrisUrl.includes('/auth')) {
        result.lucatris = 'YES';
        console.log(`Lucatris:YES`);
      } else {
        result.lucatris = 'NO';
        console.log(`Lucatris:NO`);
      }
    } catch {
      result.lucatris = 'ERROR';
      console.log(`Lucatris:ERR`);
    }

    results.push(result);
  }

  // Calculate statistics
  const qimsSuccess = results.filter(r => r.qims === 'YES').length;
  const qimsFailed = results.filter(r => r.qims !== 'YES').length;
  const lucatrisSuccess = results.filter(r => r.lucatris === 'YES').length;
  const lucatrisFailed = results.filter(r => r.lucatris !== 'YES').length;

  console.log(`\n========================================`);
  console.log(`TEST COMPLETE`);
  console.log(`========================================`);
  console.log(`QIMS: ${qimsSuccess} success, ${qimsFailed} failed`);
  console.log(`Lucatris: ${lucatrisSuccess} success, ${lucatrisFailed} failed`);
  console.log(`========================================\n`);

  // Generate results file
  const qimsFailedList = results.filter(r => r.qims !== 'YES');
  const lucatrisFailedList = results.filter(r => r.lucatris !== 'YES');
  const bothFailedList = results.filter(r => r.qims !== 'YES' && r.lucatris !== 'YES');

  // Group by branch
  const branchStats: Map<string, { total: number; qimsYes: number; lucatrisYes: number }> = new Map();
  for (const r of results) {
    const branch = r.branch || 'Unknown';
    if (!branchStats.has(branch)) {
      branchStats.set(branch, { total: 0, qimsYes: 0, lucatrisYes: 0 });
    }
    const stats = branchStats.get(branch)!;
    stats.total++;
    if (r.qims === 'YES') stats.qimsYes++;
    if (r.lucatris === 'YES') stats.lucatrisYes++;
  }

  // Build markdown content
  let md = `# Login Test Results\n\n`;
  md += `**Date:** ${now.toISOString().split('T')[0]}\n`;
  md += `**Time:** ${now.toTimeString().split(' ')[0]}\n`;
  md += `**Source:** data\\user-qims-regu-updated-2026-01-28.csv\n\n`;
  md += `---\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Users with Email | ${users.length} |\n`;
  md += `| Skipped (No Email) | ${skippedUsers.length} |\n\n`;

  md += `## Login Results\n\n`;
  md += `| System | Success | Failed | Rate |\n`;
  md += `|--------|---------|--------|------|\n`;
  md += `| QIMS | ${qimsSuccess} | ${qimsFailed} | ${((qimsSuccess / results.length) * 100).toFixed(1)}% |\n`;
  md += `| Lucatris | ${lucatrisSuccess} | ${lucatrisFailed} | ${((lucatrisSuccess / results.length) * 100).toFixed(1)}% |\n\n`;

  md += `---\n\n`;
  md += `## Results by Branch\n\n`;
  md += `| Branch | Total | QIMS OK | Lucatris OK |\n`;
  md += `|--------|-------|---------|-------------|\n`;
  for (const [branch, stats] of branchStats) {
    md += `| ${branch} | ${stats.total} | ${stats.qimsYes} | ${stats.lucatrisYes} |\n`;
  }
  md += `\n`;

  md += `---\n\n`;
  md += `## QIMS Failed (${qimsFailedList.length} users)\n\n`;
  if (qimsFailedList.length > 0) {
    md += `| No | Name | Email | Branch | Role |\n`;
    md += `|----|------|-------|--------|------|\n`;
    qimsFailedList.forEach((r, idx) => {
      md += `| ${idx + 1} | ${r.name} | ${r.email} | ${r.branch} | ${r.role} |\n`;
    });
  } else {
    md += `No failed users.\n`;
  }
  md += `\n`;

  md += `---\n\n`;
  md += `## Lucatris Failed (${lucatrisFailedList.length} users)\n\n`;
  if (lucatrisFailedList.length > 0) {
    md += `| No | Name | Email | Branch | Role |\n`;
    md += `|----|------|-------|--------|------|\n`;
    lucatrisFailedList.forEach((r, idx) => {
      md += `| ${idx + 1} | ${r.name} | ${r.email} | ${r.branch} | ${r.role} |\n`;
    });
  } else {
    md += `No failed users.\n`;
  }
  md += `\n`;

  md += `---\n\n`;
  md += `## Both Failed (${bothFailedList.length} users)\n\n`;
  if (bothFailedList.length > 0) {
    md += `| No | Name | Email | Branch | Role |\n`;
    md += `|----|------|-------|--------|------|\n`;
    bothFailedList.forEach((r, idx) => {
      md += `| ${idx + 1} | ${r.name} | ${r.email} | ${r.branch} | ${r.role} |\n`;
    });
  } else {
    md += `No users failed on both systems.\n`;
  }
  md += `\n`;

  md += `---\n\n`;
  md += `## Skipped Users - No Email (${skippedUsers.length} users)\n\n`;
  if (skippedUsers.length > 0) {
    md += `| No | Name | Branch | Remark |\n`;
    md += `|----|------|--------|--------|\n`;
    skippedUsers.forEach((u, idx) => {
      md += `| ${idx + 1} | ${u.name} | ${u.branch} | ${u.remark} |\n`;
    });
  } else {
    md += `No skipped users.\n`;
  }
  md += `\n`;

  md += `---\n\n`;
  md += `## Full Results\n\n`;
  md += `| No | Name | Email | Branch | QIMS | Lucatris |\n`;
  md += `|----|------|-------|--------|------|----------|\n`;
  results.forEach((r, idx) => {
    const qIcon = r.qims === 'YES' ? 'YES' : 'NO';
    const lIcon = r.lucatris === 'YES' ? 'YES' : 'NO';
    md += `| ${idx + 1} | ${r.name} | ${r.email} | ${r.branch} | ${qIcon} | ${lIcon} |\n`;
  });

  // Write results to new file
  const resultsDir = path.join(__dirname, '..', 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const outputPath = path.join(resultsDir, `login-test-results-${timestamp}.md`);
  fs.writeFileSync(outputPath, md);
  console.log(`\nResults saved to: ${outputPath}`);

  // Also save CSV format
  let csv = `Name;Email;Role;Branch;QIMS;Lucatris\n`;
  for (const r of results) {
    csv += `${r.name};${r.email};${r.role};${r.branch};${r.qims};${r.lucatris}\n`;
  }
  const csvOutputPath = path.join(resultsDir, `login-test-results-${timestamp}.csv`);
  fs.writeFileSync(csvOutputPath, csv);
  console.log(`CSV saved to: ${csvOutputPath}`);

  expect(results.length).toBe(users.length);
});
