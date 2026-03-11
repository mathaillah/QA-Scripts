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

// Test QIMS login
async function testQimsLogin(page: any, email: string, password: string): Promise<boolean> {
  try {
    await page.goto('http://5.223.61.214:3000/sign-in', { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    if (!currentUrl.includes('sign-in')) {
      // Login successful, logout
      try {
        await page.goto('http://5.223.61.214:3000/sign-in', { timeout: 10000 });
      } catch {}
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Test Lucatris login
async function testLucatrisLogin(page: any, email: string, password: string): Promise<boolean> {
  try {
    await page.goto('https://lucatris.radiant-utama.com/login', { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();

    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    if (!currentUrl.includes('login')) {
      // Login successful, logout
      try {
        await page.goto('https://lucatris.radiant-utama.com/login', { timeout: 10000 });
      } catch {}
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

test('Test login for all users using Email Registered on QIMS', async ({ page }) => {
  test.setTimeout(7200000); // 2 hours

  const csvPath = path.join(__dirname, '..', 'data', 'Rekap-List-User-with-QIMS-data-2026-01-28T06-51-28.csv');
  const users = parseCsv(csvPath);

  const password = 'rui123';

  console.log(`\n========================================`);
  console.log(`LOGIN TEST - REKAP USERS`);
  console.log(`========================================`);
  console.log(`Total users: ${users.length}`);
  console.log(`Password: ${password}`);
  console.log(`========================================\n`);

  let testedCount = 0;
  let skippedCount = 0;
  let qimsSuccess = 0;
  let qimsFailed = 0;
  let lucatrisSuccess = 0;
  let lucatrisFailed = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const testEmail = user.emailRegisteredOnQims.trim();

    if (!testEmail || !testEmail.includes('@')) {
      console.log(`[${i + 1}/${users.length}] SKIP: ${user.name} - No QIMS email`);
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
  }

  // Generate output
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;

  const outputDir = path.join(__dirname, '..', 'data');

  // CSV output
  let csv = `Name;Email;Role;Branch;Original Remark;QIMS Login Test;Lucatris Login Test;Email Exist on QIMS;Email Registered on QIMS;QIMS Role;QIMS Branch;QIMS Status;Merge Remark\n`;
  for (const user of users) {
    csv += `${user.name};${user.email};${user.role};${user.branch};${user.originalRemark};${user.qimsLoginTest};${user.lucatrisLoginTest};${user.emailExistOnQims};${user.emailRegisteredOnQims};${user.qimsRole};${user.qimsBranch};${user.qimsStatus};${user.mergeRemark}\n`;
  }

  const csvPath2 = path.join(outputDir, `Rekap-List-User-Login-Test-${timestamp}.csv`);
  fs.writeFileSync(csvPath2, csv);
  console.log(`\nCSV saved to: ${csvPath2}`);

  // Summary
  console.log(`\n========================================`);
  console.log(`TEST COMPLETE`);
  console.log(`========================================`);
  console.log(`Tested: ${testedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`QIMS: ${qimsSuccess} success, ${qimsFailed} failed`);
  console.log(`Lucatris: ${lucatrisSuccess} success, ${lucatrisFailed} failed`);
  console.log(`========================================\n`);

  expect(testedCount).toBeGreaterThan(0);
});
