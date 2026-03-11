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

// Remaining failed users (12) - updated 2026-01-27 with corrected emails from CSV
// Note: Users with "tidak ada data" excluded: BOBY SAFRA MADONA, ERIZAL, MASHUDI, RIZKY BAHTIAR SIDIQ, ANDIKA BAGAS RISMAWAN, ARIEF HANDITIO
// Note: DANI ALRAMADANSYAH passed on previous retest
const failedUsers: UserData[] = [
  { name: 'Tirtana Bayu Aji', email: 'tirtana.aji@radiant-utama.com', role: '', branch: 'Cirebon' }, // corrected from aji.tirtana
  { name: 'Bambang Hadi Prayitno', email: 'bambang.hadip@radiant-utama.com', role: '', branch: 'Jakarta' }, // corrected from bambang.hadiprayitno
  { name: 'AGENG LAKSITO', email: 'ageng.laksito@radiant-utama.com', role: '', branch: 'Jakarta' },
  { name: 'NASRULLAH', email: 'nasrul@radiant-utama.com', role: '', branch: 'Palembang' }, // corrected from nasrullah
  { name: 'Wahyu Suponco', email: 'wahyusuponco4@gmail.com', role: '', branch: 'Jakarta' },
  { name: 'YOANES YUSTIADI', email: 'yoanes.yustiadi@radiant-utama.com', role: '', branch: 'Jakarta' }, // corrected from yoanes.yusiadi
  { name: 'Yusril Anwar', email: 'yusril.anwar@radiant-utama.com', role: '', branch: 'Jakarta' }, // corrected from yusrilanwar
];

test('Lucatris Login RETEST - Failed users only', async ({ page, context }) => {
  test.setTimeout(600000); // 10 minutes

  console.log(`\n========================================`);
  console.log(`Lucatris Login RETEST - Failed users: ${failedUsers.length}`);
  console.log(`========================================\n`);

  const password = 'rui123';
  const successUsers: { name: string; email: string; role: string; branch: string }[] = [];
  const stillFailedUsers: { name: string; email: string; role: string; branch: string; reason: string }[] = [];

  for (let i = 0; i < failedUsers.length; i++) {
    const user = failedUsers[i];
    console.log(`\n[${i + 1}/${failedUsers.length}] Retesting: ${user.name} (${user.email})`);

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
          await context.clearCookies();
        } catch {
          // Ignore logout errors
        }
      } else {
        // Still on auth page, capture the actual error message
        let reason = 'Login failed';

        try {
          const errorText = page.locator('[class*="error"], [class*="alert"], [role="alert"]');
          if (await errorText.count() > 0) {
            reason = await errorText.first().innerText();
          } else {
            const invalidError = page.getByText(/invalid|incorrect|wrong|error|gagal|not found/i);
            if (await invalidError.count() > 0) {
              reason = await invalidError.first().innerText();
            }
          }
        } catch {
          // Keep default reason
        }

        console.log(`  ✗ STILL FAILED - ${reason}`);
        stillFailedUsers.push({ name: user.name, email: user.email, role: user.role, branch: user.branch, reason });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ ERROR - ${errorMessage}`);
      stillFailedUsers.push({ name: user.name, email: user.email, role: user.role, branch: user.branch, reason: errorMessage });

      if (errorMessage.includes('Target page, context or browser has been closed') ||
          errorMessage.includes('Protocol error')) {
        console.log('  Browser closed unexpectedly, saving partial results...');
        break;
      }
    }

    try {
      await page.waitForTimeout(1000);
    } catch {
      console.log('  Browser closed, saving partial results...');
      break;
    }
  }

  // Save retest results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsDir = path.join(__dirname, '..', 'test-results');

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const resultsFile = path.join(resultsDir, `lucatris-login-retest-${timestamp}.md`);

  let mdContent = `# Lucatris Login RETEST Results\n\n`;
  mdContent += `**Date:** ${new Date().toISOString()}\n\n`;
  mdContent += `**Password Used:** ${password}\n\n`;
  mdContent += `**Note:** This is a retest of previously failed logins only.\n\n`;
  mdContent += `## Summary\n\n`;
  mdContent += `| Metric | Count |\n`;
  mdContent += `|--------|-------|\n`;
  mdContent += `| Total Retested | ${successUsers.length + stillFailedUsers.length} |\n`;
  mdContent += `| Now Successful | ${successUsers.length} |\n`;
  mdContent += `| Still Failed | ${stillFailedUsers.length} |\n\n`;

  if (successUsers.length > 0) {
    mdContent += `## Now Successful (${successUsers.length})\n\n`;
    mdContent += `| No | Name | Email | Role | Branch | Remark |\n`;
    mdContent += `|----|------|-------|------|--------|--------|\n`;
    successUsers.forEach((u, idx) => {
      mdContent += `| ${idx + 1} | ${u.name} | ${u.email} | ${u.role} | ${u.branch} | Login successful on retest |\n`;
    });
    mdContent += `\n`;
  }

  if (stillFailedUsers.length > 0) {
    mdContent += `## Still Failed (${stillFailedUsers.length})\n\n`;
    mdContent += `| No | Name | Email | Role | Branch | Remark |\n`;
    mdContent += `|----|------|-------|------|--------|--------|\n`;
    stillFailedUsers.forEach((u, idx) => {
      mdContent += `| ${idx + 1} | ${u.name} | ${u.email} | ${u.role} | ${u.branch} | ${u.reason} |\n`;
    });
    mdContent += `\n`;
  }

  fs.writeFileSync(resultsFile, mdContent);

  // Print summary
  console.log(`\n========================================`);
  console.log(`RETEST COMPLETE`);
  console.log(`========================================`);
  console.log(`Total retested: ${successUsers.length + stillFailedUsers.length}`);
  console.log(`Now successful: ${successUsers.length}`);
  console.log(`Still failed: ${stillFailedUsers.length}`);
  console.log(`Results saved to: ${resultsFile}`);
  console.log(`========================================\n`);

  expect(successUsers.length + stillFailedUsers.length).toBeGreaterThan(0);
});
