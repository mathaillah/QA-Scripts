import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface UserData {
  rowIndex: number;
  name: string;
  email: string;
  role: string;
  branch: string;
  qimsLogin: string;
}

// Role to Position mapping
function mapRoleToPosition(role: string): string {
  const normalizedRole = role.toUpperCase().trim();

  // Direct matches
  if (normalizedRole === 'PM') return 'PM';
  if (normalizedRole === 'BOM') return 'BOM';
  if (normalizedRole === 'INSPECTOR') return 'Inspector';

  // Lead of Branch Supporting -> Branch Operation Manager
  if (normalizedRole === 'LEAD OF BRANCH SUPPORTING') return 'Branch Operation Manager';

  // Senior Inspector, Junior Inspector -> Inspector
  if (normalizedRole === 'SENIOR INSPECTOR' || normalizedRole === 'JUNIOR INSPECTOR') {
    return 'Inspector';
  }

  // Admin Operation, Admin -> Admin
  if (normalizedRole === 'ADMIN OPERATION' || normalizedRole === 'ADMIN' || normalizedRole === 'STAFF ADMIN') {
    return 'Admin';
  }

  // These roles map to Other
  const otherRoles = [
    'INSPECTION COORDINATOR',
    'TRAINEE',
    'TEKNISI',
    'STAFF ACCOUNTING',
    'STAFF HR',
    'STAFF HR & CASHIER',
    'SHE OFFICER',
    'WAREHOUSE',
    'WAREHOUSE & ASSET',
    'DOCUMENT CONTROL',
    'HELPER',
    'COORDINATOR FINANCE',
    'STAFF AR & AP'
  ];

  if (otherRoles.includes(normalizedRole)) {
    return 'Other';
  }

  // Default to Other for unknown roles
  console.log(`  [WARNING] Unknown role "${role}" - defaulting to "Other"`);
  return 'Other';
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
      const qimsLogin = parts[5]?.trim() || '';

      if (email && email.includes('@')) {
        users.push({ rowIndex: i, name, email, role, branch, qimsLogin });
      }
    }
  }

  return { users, lines };
}

function updateCsvLine(line: string, qimsStatus: string): string {
  const parts = line.split(';');
  while (parts.length < 8) {
    parts.push('');
  }
  parts[5] = qimsStatus;
  return parts.join(';');
}

test('Create new users in QIMS', async ({ page }) => {
  test.setTimeout(7200000); // 2 hours

  const csvPath = path.join(__dirname, '..', 'data', 'new-users-tested-2026-01-27_17-41-55.csv');
  const { users, lines } = parseCsv(csvPath);

  // Filter users that need to be created (QIMS Login is empty)
  const usersToCreate = users.filter(u => !u.qimsLogin || u.qimsLogin !== 'YES');

  console.log(`\n========================================`);
  console.log(`QIMS User Creation`);
  console.log(`========================================`);
  console.log(`Total users in CSV: ${users.length}`);
  console.log(`Users to create (QIMS Login empty): ${usersToCreate.length}`);
  console.log(`========================================\n`);

  if (usersToCreate.length === 0) {
    console.log('No users to create. All users already have QIMS Login = YES');
    return;
  }

  const password = 'rui123';
  const adminEmail = 'aan.pujihidayat@radiant-utama.com';

  const created: number[] = [];
  const failed: { user: UserData; reason: string }[] = [];
  const skipped: { user: UserData; reason: string }[] = [];

  // Login as admin
  console.log(`Logging in as ${adminEmail}...`);
  await page.goto('http://5.223.61.214:3000/sign-in', { timeout: 60000 });
  await page.waitForLoadState('networkidle');

  await page.getByRole('textbox', { name: 'Email' }).fill(adminEmail);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForTimeout(3000);

  // Verify login successful
  if (page.url().includes('sign-in')) {
    throw new Error('Admin login failed');
  }
  console.log('Login successful!\n');

  // Navigate to Users dashboard
  console.log('Navigating to Users dashboard...');
  await page.goto('http://5.223.61.214:3000/dashboard/users', { timeout: 60000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('On Users dashboard\n');

  // Create each user
  for (let i = 0; i < usersToCreate.length; i++) {
    const user = usersToCreate[i];
    const position = mapRoleToPosition(user.role);

    console.log(`[${i + 1}/${usersToCreate.length}] Creating: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role} -> Position: ${position}`);
    console.log(`  Branch: ${user.branch}`);

    try {
      // Navigate to Create User page
      await page.goto('http://5.223.61.214:3000/dashboard/users/create', { timeout: 60000 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Step 1: Select inspector from dropdown (Full Name)
      const fullNameCombo = page.getByRole('combobox', { name: 'Full Name' });
      await fullNameCombo.click();
      await page.waitForTimeout(500);

      // Search for inspector by first name
      const searchName = user.name.split(' ')[0].toLowerCase();
      const searchInput = page.getByPlaceholder('Search inspector...');
      await searchInput.fill(searchName);
      await page.waitForTimeout(1500);

      // Try to find and select the user
      const userOption = page.getByRole('option', { name: user.name });
      const optionCount = await userOption.count();

      if (optionCount === 0) {
        console.log(`  ✗ SKIPPED - User "${user.name}" not found in inspector dropdown`);
        skipped.push({ user, reason: 'User not found in inspector dropdown' });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        // Navigate back to create user page for next user
        await page.goto('http://5.223.61.214:3000/dashboard/users/create', { timeout: 60000 });
        await page.waitForTimeout(1000);
        continue;
      }

      // Use first() if multiple matches found
      if (optionCount > 1) {
        console.log(`  [INFO] Multiple matches found (${optionCount}), selecting first`);
        await userOption.first().click();
      } else {
        await userOption.click();
      }
      await page.waitForTimeout(500);

      // Press Escape to close dropdown
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Step 2: Fill email
      const emailField = page.getByRole('textbox', { name: 'Email' });
      await emailField.click();
      await emailField.clear();
      await emailField.fill(user.email);
      await page.waitForTimeout(300);

      // Step 3: Select position from dropdown
      const positionCombo = page.getByRole('combobox', { name: 'Position' });
      await positionCombo.click();
      await page.waitForTimeout(500);

      const positionOption = page.getByRole('option', { name: position });
      const positionCount = await positionOption.count();

      if (positionCount === 0) {
        console.log(`  ✗ SKIPPED - Position "${position}" not found in dropdown`);
        skipped.push({ user, reason: `Position "${position}" not found` });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        // Navigate back to create user page for next user
        await page.goto('http://5.223.61.214:3000/dashboard/users/create', { timeout: 60000 });
        await page.waitForTimeout(1000);
        continue;
      }

      await positionOption.click();
      await page.waitForTimeout(300);

      // Press Escape to close dropdown
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Step 4: Fill password
      const passwordField = page.getByRole('textbox', { name: 'Password', exact: true });
      await passwordField.fill(password);
      await page.waitForTimeout(300);

      // Step 5: Fill confirm password
      const confirmPasswordField = page.getByRole('textbox', { name: 'Confirm Password Confirm' });
      await confirmPasswordField.fill(password);
      await page.waitForTimeout(300);

      // Step 6: Click Create button
      const createButton = page.getByRole('button', { name: 'Create' });
      await createButton.click();
      await page.waitForTimeout(3000);

      // Check result
      const currentUrl = page.url();
      const pageContent = await page.content();

      // Check for error messages
      if (pageContent.toLowerCase().includes('already exist') ||
          pageContent.toLowerCase().includes('user already') ||
          pageContent.toLowerCase().includes('email already')) {
        console.log(`  ✓ ALREADY EXISTS`);
        created.push(user.rowIndex);
      } else if (currentUrl.includes('/dashboard/users') && !currentUrl.includes('/create')) {
        // Redirected to users list = success
        console.log(`  ✓ SUCCESS`);
        created.push(user.rowIndex);
      } else if (pageContent.toLowerCase().includes('success')) {
        console.log(`  ✓ SUCCESS`);
        created.push(user.rowIndex);
      } else {
        // Check for any error alert
        const errorAlert = page.locator('[role="alert"], .error, .toast-error');
        if (await errorAlert.count() > 0) {
          const errorText = await errorAlert.first().innerText().catch(() => 'Unknown error');
          console.log(`  ✗ FAILED - ${errorText}`);
          failed.push({ user, reason: errorText });
        } else {
          // Assume success if no obvious error
          console.log(`  ✓ SUCCESS (assumed)`);
          created.push(user.rowIndex);
        }
      }

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const shortMsg = msg.substring(0, 80);
      console.log(`  ✗ ERROR - ${shortMsg}`);
      failed.push({ user, reason: shortMsg });

      // Recovery: go back to users page
      try {
        await page.goto('http://5.223.61.214:3000/dashboard/users', { timeout: 30000 });
        await page.waitForTimeout(1000);
      } catch {
        // If recovery fails, try to re-login
        try {
          await page.goto('http://5.223.61.214:3000/sign-in', { timeout: 30000 });
          await page.getByRole('textbox', { name: 'Email' }).fill(adminEmail);
          await page.getByRole('textbox', { name: 'Password' }).fill(password);
          await page.getByRole('button', { name: 'Sign In' }).click();
          await page.waitForTimeout(3000);
        } catch {
          console.log('  [Recovery failed]');
        }
      }
    }
  }

  // Update CSV with results
  console.log(`\n========== UPDATING CSV ==========\n`);

  const updatedLines = [...lines];
  for (const rowIndex of created) {
    if (updatedLines[rowIndex]) {
      updatedLines[rowIndex] = updateCsvLine(updatedLines[rowIndex], 'YES');
    }
  }

  const now = new Date();
  const timestamp = `${now.toISOString().slice(0, 10)}_${now.toTimeString().slice(0, 8).replace(/:/g, '-')}`;

  const dataDir = path.join(__dirname, '..', 'data');
  const updatedCsvPath = path.join(dataDir, `qims-users-created-${timestamp}.csv`);
  fs.writeFileSync(updatedCsvPath, updatedLines.join('\n'), 'utf-8');

  // Save results report
  const resultsDir = path.join(__dirname, '..', 'test-results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const resultsFile = path.join(resultsDir, `qims-create-users-${timestamp}.md`);

  let md = `# QIMS User Creation Results\n\n`;
  md += `**Date:** ${now.toISOString()}\n\n`;
  md += `**Admin Account:** ${adminEmail}\n\n`;
  md += `## Summary\n\n`;
  md += `| Status | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| Created/Exists | ${created.length} |\n`;
  md += `| Failed | ${failed.length} |\n`;
  md += `| Skipped | ${skipped.length} |\n`;
  md += `| Total to Create | ${usersToCreate.length} |\n\n`;

  if (created.length > 0) {
    md += `## Created/Existing Users (${created.length})\n\n`;
    md += `| No | Name | Email | Role | Position |\n`;
    md += `|----|------|-------|------|----------|\n`;
    let num = 1;
    for (const user of usersToCreate) {
      if (created.includes(user.rowIndex)) {
        md += `| ${num++} | ${user.name} | ${user.email} | ${user.role} | ${mapRoleToPosition(user.role)} |\n`;
      }
    }
    md += `\n`;
  }

  if (failed.length > 0) {
    md += `## Failed (${failed.length})\n\n`;
    md += `| Name | Email | Reason |\n`;
    md += `|------|-------|--------|\n`;
    failed.forEach(f => {
      md += `| ${f.user.name} | ${f.user.email} | ${f.reason} |\n`;
    });
    md += `\n`;
  }

  if (skipped.length > 0) {
    md += `## Skipped - Not in Inspector List (${skipped.length})\n\n`;
    md += `| Name | Email | Role | Reason |\n`;
    md += `|------|-------|------|--------|\n`;
    skipped.forEach(s => {
      md += `| ${s.user.name} | ${s.user.email} | ${s.user.role} | ${s.reason} |\n`;
    });
    md += `\n`;
  }

  fs.writeFileSync(resultsFile, md);

  console.log(`\n========================================`);
  console.log(`USER CREATION COMPLETE`);
  console.log(`========================================`);
  console.log(`Created/Exists: ${created.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Skipped: ${skipped.length}`);
  console.log(`CSV: ${updatedCsvPath}`);
  console.log(`Results: ${resultsFile}`);
  console.log(`========================================\n`);

  expect(created.length + skipped.length).toBeGreaterThan(0);
});
