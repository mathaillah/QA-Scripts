import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Interface for user data
interface UserData {
  name: string;
  email: string;
  role: string;
}

// Function to parse markdown table
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
      const role = parts[3].trim().toUpperCase();

      // Map role to dropdown values
      // Available roles in dropdown: Project Manager, Inspector
      let mappedRole = 'Inspector'; // Default to Inspector
      if (role === 'PROJECT MANAGER' || role === 'PM') {
        mappedRole = 'Project Manager';
      } else if (role === 'INSPECTOR') {
        mappedRole = 'Inspector';
      } else if (role === 'WAREHOUSE' || role === 'WH' || role === 'RESOURCE MANAGER' || role === 'RM' || role === 'IT') {
        // These roles may not exist in dropdown, map to Inspector
        mappedRole = 'Inspector';
      }

      if (email && email.includes('@')) {
        users.push({
          name,
          email,
          role: mappedRole
        });
      }
    }
  }

  return users;
}

test('Create users from user-list.md', async ({ page }) => {
  // Read user list from file
  const userListPath = path.join(__dirname, '..', 'data', 'user-list.md');
  const users = parseUserList(userListPath);

  console.log(`\n========================================`);
  console.log(`Create Users Test - Total users: ${users.length}`);
  console.log(`========================================\n`);

  const password = 'rui123';
  const successUsers: string[] = [];
  const failedUsers: { email: string; reason: string }[] = [];

  // Login first
  await page.goto('https://lucatris.com/auth', { timeout: 60000 });
  await page.getByRole('textbox', { name: 'Email' }).fill('tis.admin@radiant-utama.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('rui123!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for login to complete
  await page.waitForTimeout(3000);

  // Navigate to User page
  await page.getByRole('link', { name: 'User' }).click();
  await page.waitForTimeout(2000);

  // Loop through each user
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`\n[${i + 1}/${users.length}] Creating user: ${user.name} (${user.email})`);

    try {
      // Click Add Users button
      await page.getByRole('button', { name: 'plus Add Users' }).click();
      await page.waitForTimeout(1000);

      // Fill user form
      await page.getByRole('textbox', { name: 'Name' }).fill(user.name);
      await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByLabel('Role').selectOption(user.role);
      await page.getByLabel('Status').selectOption('true');

      // Click Add button
      await page.getByRole('button', { name: 'Add' }).click();
      await page.waitForTimeout(2000);

      // Check for success or error message
      const errorMessage = page.getByText(/already exists|error|failed/i);
      if (await errorMessage.count() > 0) {
        const reason = await errorMessage.first().innerText();
        console.log(`  ✗ FAILED - ${reason}`);
        failedUsers.push({ email: user.email, reason });

        // Close modal if still open
        const closeButton = page.getByRole('button', { name: 'Cancel' });
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await page.waitForTimeout(500);
        }
      } else {
        console.log(`  ✓ SUCCESS - User created successfully`);
        successUsers.push(user.email);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ ERROR - ${errorMessage}`);
      failedUsers.push({ email: user.email, reason: errorMessage });

      // Check if browser closed
      if (errorMessage.includes('Target page, context or browser has been closed') ||
          errorMessage.includes('Protocol error')) {
        console.log('  Browser closed unexpectedly, saving partial results...');
        break;
      }

      // Try to recover - close any open modals
      try {
        const closeButton = page.getByRole('button', { name: 'Cancel' });
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await page.waitForTimeout(500);
        }
      } catch {
        // Ignore recovery errors
      }
    }

    // Small delay between users
    await page.waitForTimeout(1000);
  }

  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsDir = path.join(__dirname, '..', 'test-results');

  // Create directory if it doesn't exist
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const resultsFile = path.join(resultsDir, `create-user-results-${timestamp}.txt`);

  let resultsContent = `Create Users Test Results\n`;
  resultsContent += `========================\n`;
  resultsContent += `Date: ${new Date().toISOString()}\n`;
  resultsContent += `Total users processed: ${successUsers.length + failedUsers.length}\n`;
  resultsContent += `Successful: ${successUsers.length}\n`;
  resultsContent += `Failed: ${failedUsers.length}\n\n`;

  resultsContent += `--- SUCCESSFUL CREATIONS ---\n`;
  successUsers.forEach(email => {
    resultsContent += `${email}\n`;
  });

  resultsContent += `\n--- FAILED CREATIONS ---\n`;
  failedUsers.forEach(({ email, reason }) => {
    resultsContent += `${email} | Reason: ${reason}\n`;
  });

  fs.writeFileSync(resultsFile, resultsContent);

  // Print summary
  console.log(`\n========================================`);
  console.log(`TEST COMPLETE`);
  console.log(`========================================`);
  console.log(`Total processed: ${successUsers.length + failedUsers.length}`);
  console.log(`Successful: ${successUsers.length}`);
  console.log(`Failed: ${failedUsers.length}`);
  console.log(`Results saved to: ${resultsFile}`);
  console.log(`========================================\n`);

  // Assert at least some tests ran
  expect(successUsers.length + failedUsers.length).toBeGreaterThan(0);
});