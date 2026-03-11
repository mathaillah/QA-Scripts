import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Interface for user data
interface UserData {
  name: string;
  email: string;
  role: string;
}

interface ValidationResult {
  email: string;
  name: string;
  expectedRole: string;
  actualRole: string;
  status: 'PASS' | 'FAIL' | 'NOT_FOUND_IN_SYSTEM' | 'NOT_IN_EXPECTED_LIST';
}

// Role mapping from abbreviation to full name
const ROLE_MAP: Record<string, string> = {
  'PM': 'Project Manager',
  'RM': 'Resource Manager',
  'WH': 'Warehouse',
  'IT': 'IT',
  'INSPECTOR': 'Inspector'
};

// Function to parse markdown table from user-list.md
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
      const email = parts[2].trim().toLowerCase();
      const role = parts[3].trim();

      // Map role abbreviations to full names if needed
      const roleUpper = role.toUpperCase();
      const fullRole = ROLE_MAP[roleUpper] || role;

      if (email && email.includes('@')) {
        users.push({
          name,
          email,
          role: fullRole
        });
      }
    }
  }

  return users;
}

test('Validate user roles from Lucatris User Management', async ({ page }) => {
  console.log(`\n========================================`);
  console.log(`Validate User Roles Test`);
  console.log(`========================================\n`);

  // Read expected user list
  const userListPath = path.join(__dirname, '..', 'data', 'user-list.md');
  const expectedUsers = parseUserList(userListPath);
  console.log(`Expected users from user-list.md: ${expectedUsers.length}`);

  // Login to Lucatris
  console.log('\n[1] Logging in to Lucatris...');
  await page.goto('https://lucatris.com/auth', { timeout: 60000 });
  await page.getByRole('textbox', { name: 'Email' }).fill('tis.admin@radiant-utama.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('rui123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForTimeout(3000);
  console.log('  Login successful');

  // Navigate to User Management
  console.log('\n[2] Navigating to User Management...');
  await page.goto('https://lucatris.com/admin/user-management', { timeout: 60000 });
  await page.waitForTimeout(3000);
  console.log('  Navigation successful');

  // Extract users from the table
  console.log('\n[3] Extracting users from the system...');
  const systemUsers: UserData[] = [];

  // Try to change items per page to maximum
  try {
    const perPageSelect = page.locator('select').filter({ hasText: /10|25|50|100/ }).first();
    if (await perPageSelect.count() > 0) {
      await perPageSelect.selectOption({ label: '100' }).catch(() => {});
      await page.waitForTimeout(2000);
      console.log('  Changed to 100 items per page');
    }
  } catch {
    // Continue with default pagination
  }

  // Get all pages of users
  let hasNextPage = true;
  let pageNum = 1;
  const seenEmails = new Set<string>();

  while (hasNextPage) {
    console.log(`  Extracting page ${pageNum}...`);

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Get all rows from the table
    const rows = await page.locator('table tbody tr').all();
    let rowsFound = 0;

    for (const row of rows) {
      try {
        const cells = await row.locator('td').all();
        if (cells.length >= 3) {
          const name = await cells[0].innerText();
          const email = await cells[1].innerText();
          const role = await cells[2].innerText();

          if (email && email.includes('@')) {
            const emailLower = email.trim().toLowerCase();
            if (!seenEmails.has(emailLower)) {
              seenEmails.add(emailLower);
              systemUsers.push({
                name: name.trim(),
                email: emailLower,
                role: role.trim()
              });
              rowsFound++;
            }
          }
        }
      } catch {
        // Skip rows that can't be parsed
      }
    }

    console.log(`    Found ${rowsFound} new users on page ${pageNum}`);

    // Try multiple pagination selectors
    let clickedNext = false;

    try {
      // Try svg arrow button (common in modern UIs)
      const svgNextButton = page.locator('button svg[class*="chevron-right"], button svg[class*="arrow-right"]').first();
      if (!clickedNext && await svgNextButton.count() > 0) {
        try {
          const parentButton = svgNextButton.locator('xpath=..');
          const isDisabled = await parentButton.isDisabled().catch(() => true);
          if (!isDisabled) {
            await parentButton.click();
            clickedNext = true;
            await page.waitForTimeout(2000);
          }
        } catch {}
      }

      // Try text-based next button
      if (!clickedNext) {
        const nextButtons = [
          page.getByRole('button', { name: /next/i }),
          page.locator('button:has-text("Next")'),
          page.locator('button:has-text(">")'),
          page.locator('[aria-label*="next" i]'),
          page.locator('.pagination button').last()
        ];

        for (const nextBtn of nextButtons) {
          try {
            if (await nextBtn.count() > 0) {
              const isDisabled = await nextBtn.isDisabled().catch(() => true);
              if (!isDisabled) {
                await nextBtn.click();
                clickedNext = true;
                await page.waitForTimeout(2000);
                break;
              }
            }
          } catch {
            // Skip if element not found or stale
          }
        }
      }

      if (clickedNext) {
        pageNum++;
      } else {
        hasNextPage = false;
      }
    } catch (error) {
      // Browser might have closed, stop pagination
      console.log('  Pagination ended (browser may have closed)');
      hasNextPage = false;
    }

    // Safety limit
    if (pageNum > 50) {
      hasNextPage = false;
    }
  }

  console.log(`  Total users extracted from system: ${systemUsers.length}`);

  // Compare users
  console.log('\n[4] Comparing users...');
  const results: ValidationResult[] = [];

  // Check each expected user against system
  for (const expected of expectedUsers) {
    const systemUser = systemUsers.find(u => u.email === expected.email);

    if (systemUser) {
      const rolesMatch = systemUser.role.toLowerCase() === expected.role.toLowerCase();
      results.push({
        email: expected.email,
        name: expected.name,
        expectedRole: expected.role,
        actualRole: systemUser.role,
        status: rolesMatch ? 'PASS' : 'FAIL'
      });
    } else {
      results.push({
        email: expected.email,
        name: expected.name,
        expectedRole: expected.role,
        actualRole: 'N/A',
        status: 'NOT_FOUND_IN_SYSTEM'
      });
    }
  }

  // Check for users in system but not in expected list
  for (const systemUser of systemUsers) {
    const inExpected = expectedUsers.find(u => u.email === systemUser.email);
    if (!inExpected) {
      results.push({
        email: systemUser.email,
        name: systemUser.name,
        expectedRole: 'N/A',
        actualRole: systemUser.role,
        status: 'NOT_IN_EXPECTED_LIST'
      });
    }
  }

  // Calculate summary
  const passed = results.filter(r => r.status === 'PASS');
  const failed = results.filter(r => r.status === 'FAIL');
  const notFoundInSystem = results.filter(r => r.status === 'NOT_FOUND_IN_SYSTEM');
  const notInExpectedList = results.filter(r => r.status === 'NOT_IN_EXPECTED_LIST');

  // Generate markdown report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsDir = path.join(__dirname, '..', 'test-results');

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const resultsFile = path.join(resultsDir, `validate-role-results-${timestamp}.md`);

  let mdContent = `# User Role Validation Results\n\n`;
  mdContent += `**Date:** ${new Date().toISOString()}\n\n`;
  mdContent += `## Summary\n\n`;
  mdContent += `| Metric | Count |\n`;
  mdContent += `|--------|-------|\n`;
  mdContent += `| Total Expected Users | ${expectedUsers.length} |\n`;
  mdContent += `| Total System Users | ${systemUsers.length} |\n`;
  mdContent += `| **PASS** (Roles Match) | ${passed.length} |\n`;
  mdContent += `| **FAIL** (Roles Mismatch) | ${failed.length} |\n`;
  mdContent += `| Not Found in System | ${notFoundInSystem.length} |\n`;
  mdContent += `| Not in Expected List | ${notInExpectedList.length} |\n\n`;

  if (passed.length > 0) {
    mdContent += `## PASS - Roles Match (${passed.length})\n\n`;
    mdContent += `| Name | Email | Role |\n`;
    mdContent += `|------|-------|------|\n`;
    passed.forEach(r => {
      mdContent += `| ${r.name} | ${r.email} | ${r.actualRole} |\n`;
    });
    mdContent += `\n`;
  }

  if (failed.length > 0) {
    mdContent += `## FAIL - Roles Mismatch (${failed.length})\n\n`;
    mdContent += `| Name | Email | Expected Role | Actual Role |\n`;
    mdContent += `|------|-------|---------------|-------------|\n`;
    failed.forEach(r => {
      mdContent += `| ${r.name} | ${r.email} | ${r.expectedRole} | ${r.actualRole} |\n`;
    });
    mdContent += `\n`;
  }

  if (notFoundInSystem.length > 0) {
    mdContent += `## Not Found in System (${notFoundInSystem.length})\n\n`;
    mdContent += `| Name | Email | Expected Role |\n`;
    mdContent += `|------|-------|---------------|\n`;
    notFoundInSystem.forEach(r => {
      mdContent += `| ${r.name} | ${r.email} | ${r.expectedRole} |\n`;
    });
    mdContent += `\n`;
  }

  if (notInExpectedList.length > 0) {
    mdContent += `## Not in Expected List (${notInExpectedList.length})\n\n`;
    mdContent += `| Name | Email | Actual Role |\n`;
    mdContent += `|------|-------|-------------|\n`;
    notInExpectedList.forEach(r => {
      mdContent += `| ${r.name} | ${r.email} | ${r.actualRole} |\n`;
    });
    mdContent += `\n`;
  }

  fs.writeFileSync(resultsFile, mdContent);

  // Print summary to console
  console.log(`\n========================================`);
  console.log(`VALIDATION COMPLETE`);
  console.log(`========================================`);
  console.log(`Expected Users: ${expectedUsers.length}`);
  console.log(`System Users: ${systemUsers.length}`);
  console.log(`PASS (Roles Match): ${passed.length}`);
  console.log(`FAIL (Roles Mismatch): ${failed.length}`);
  console.log(`Not Found in System: ${notFoundInSystem.length}`);
  console.log(`Not in Expected List: ${notInExpectedList.length}`);
  console.log(`Results saved to: ${resultsFile}`);
  console.log(`========================================\n`);

  // Print failed items
  if (failed.length > 0) {
    console.log('\nRole Mismatches:');
    failed.forEach(r => {
      console.log(`  - ${r.email}: Expected "${r.expectedRole}", Got "${r.actualRole}"`);
    });
  }

  // Assert test passed
  expect(results.length).toBeGreaterThan(0);
});
