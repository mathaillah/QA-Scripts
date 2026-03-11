import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface UserData {
  name: string;
  email: string;
  role: string;
  branch: string;
  originalRemark: string;
  qimsLoginTest: string;
  lucatrisLoginTest: string;
  emailExistOnQims: string;
  emailRegisteredOnQims: string;
  qimsRole: string;
  qimsBranch: string;
  qimsStatus: string;
  mergeRemark: string;
}

// Parse CSV file
function parseCsv(filePath: string): UserData[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const users: UserData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(';');
    users.push({
      name: parts[0] || '',
      email: parts[1] || '',
      role: parts[2] || '',
      branch: parts[3] || '',
      originalRemark: parts[4] || '',
      qimsLoginTest: parts[5] || '',
      lucatrisLoginTest: parts[6] || '',
      emailExistOnQims: parts[7] || '',
      emailRegisteredOnQims: parts[8] || '',
      qimsRole: parts[9] || '',
      qimsBranch: parts[10] || '',
      qimsStatus: parts[11] || '',
      mergeRemark: parts[12] || '',
    });
  }

  return users;
}

// Write CSV file
function writeCsv(filePath: string, users: UserData[]): void {
  let csv = `Name;Email;Role;Branch;Original Remark;QIMS Login Test;Lucatris Login Test;Email Exist on QIMS;Email Registered on QIMS;QIMS Role;QIMS Branch;QIMS Status;Merge Remark\n`;
  for (const user of users) {
    csv += `${user.name};${user.email};${user.role};${user.branch};${user.originalRemark};${user.qimsLoginTest};${user.lucatrisLoginTest};${user.emailExistOnQims};${user.emailRegisteredOnQims};${user.qimsRole};${user.qimsBranch};${user.qimsStatus};${user.mergeRemark}\n`;
  }
  fs.writeFileSync(filePath, csv);
}

// Test QIMS login
async function testQimsLogin(page: any, email: string, password: string): Promise<boolean> {
  try {
    await page.goto('http://5.223.61.214:3000/sign-in', { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    if (!currentUrl.includes('sign-in')) {
      // Login successful, navigate back to sign-in for next test
      try {
        await page.goto('http://5.223.61.214:3000/sign-in', { timeout: 10000 });
      } catch {}
      return true;
    }
    return false;
  } catch (error) {
    console.log(`  QIMS Error: ${error}`);
    return false;
  }
}

// Test Lucatris login
async function testLucatrisLogin(page: any, email: string, password: string): Promise<boolean> {
  try {
    await page.goto('https://lucatris.com/auth', { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Try multiple selector strategies for email field
    const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i], input[id*="email" i]').first();
    await emailField.fill(email);

    // Try multiple selector strategies for password field
    const passwordField = page.locator('input[type="password"], input[name="password"], input[placeholder*="assword" i]').first();
    await passwordField.fill(password);

    // Try multiple selector strategies for login button
    const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In"), button:has-text("Log In")').first();
    await loginButton.click();

    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    if (!currentUrl.includes('auth') && !currentUrl.includes('login')) {
      // Login successful, navigate back for next test
      try {
        await page.goto('https://lucatris.com/auth', { timeout: 10000 });
      } catch {}
      return true;
    }
    return false;
  } catch (error) {
    console.log(`  Lucatris Error: ${error}`);
    return false;
  }
}

test('Test login for users with Email Exist on QIMS = YES', async ({ page }) => {
  test.setTimeout(7200000); // 2 hours

  const inputCsvPath = path.join(__dirname, '..', 'data', 'Rekap-List-User-with-QIMS-data-2026-01-28T06-51-28.csv');
  const users = parseCsv(inputCsvPath);

  const password = 'rui123';

  // Filter users where Email Exist on QIMS = YES
  const usersToTest = users.filter(u => u.emailExistOnQims.toUpperCase() === 'YES');

  console.log(`\n========================================`);
  console.log(`LOGIN TEST - QIMS USERS`);
  console.log(`========================================`);
  console.log(`Total users in file: ${users.length}`);
  console.log(`Users to test (Email Exist on QIMS = YES): ${usersToTest.length}`);
  console.log(`Password: ${password}`);
  console.log(`QIMS URL: http://5.223.61.214:3000/sign-in`);
  console.log(`Lucatris URL: https://lucatris.com/auth`);
  console.log(`========================================\n`);

  let testedCount = 0;
  let skippedCount = 0;
  let qimsSuccess = 0;
  let qimsFailed = 0;
  let lucatrisSuccess = 0;
  let lucatrisFailed = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    // Skip if Email Exist on QIMS is not YES
    if (user.emailExistOnQims.toUpperCase() !== 'YES') {
      console.log(`[${i + 1}/${users.length}] SKIP: ${user.name} - Email Exist on QIMS = ${user.emailExistOnQims || 'empty'}`);
      skippedCount++;
      continue;
    }

    const testEmail = user.emailRegisteredOnQims.trim();

    if (!testEmail || !testEmail.includes('@')) {
      console.log(`[${i + 1}/${users.length}] SKIP: ${user.name} - No valid email in Email Registered on QIMS`);
      skippedCount++;
      continue;
    }

    console.log(`[${i + 1}/${users.length}] Testing: ${user.name} (${testEmail})`);
    testedCount++;

    // Test QIMS login
    const qimsResult = await testQimsLogin(page, testEmail, password);
    user.qimsLoginTest = qimsResult ? 'YES' : 'NO';
    if (qimsResult) {
      qimsSuccess++;
      console.log(`  QIMS: YES`);
    } else {
      qimsFailed++;
      console.log(`  QIMS: NO`);
    }

    // Test Lucatris login
    const lucatrisResult = await testLucatrisLogin(page, testEmail, password);
    user.lucatrisLoginTest = lucatrisResult ? 'YES' : 'NO';
    if (lucatrisResult) {
      lucatrisSuccess++;
      console.log(`  Lucatris: YES`);
    } else {
      lucatrisFailed++;
      console.log(`  Lucatris: NO`);
    }

    // Save progress every 10 users
    if (testedCount % 10 === 0) {
      const progressPath = path.join(__dirname, '..', 'data', `Rekap-Login-Test-Progress.csv`);
      writeCsv(progressPath, users);
      console.log(`  [Progress saved: ${testedCount} users tested]`);
    }
  }

  // Generate final output
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;

  const outputPath = path.join(__dirname, '..', 'data', `Rekap-Login-Test-Results-${timestamp}.csv`);
  writeCsv(outputPath, users);

  console.log(`\n========================================`);
  console.log(`TEST COMPLETE`);
  console.log(`========================================`);
  console.log(`Tested: ${testedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`QIMS: ${qimsSuccess} success, ${qimsFailed} failed`);
  console.log(`Lucatris: ${lucatrisSuccess} success, ${lucatrisFailed} failed`);
  console.log(`Output saved to: ${outputPath}`);
  console.log(`========================================\n`);

  expect(testedCount).toBeGreaterThan(0);
});
