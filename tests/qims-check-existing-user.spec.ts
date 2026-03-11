import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Interface for user data from CSV
interface CsvUserData {
  name: string;
  email: string;
  role: string;
  branch: string;
}

// Interface for user data found on QIMS
interface QimsUserData {
  name: string;
  email: string;
  role: string;
  branch: string;
  status: string;
}

// Interface for comparison result
interface UserComparisonResult {
  csvData: CsvUserData;
  qimsData: QimsUserData | null;
  found: boolean;
  remark: string;
}

// Function to parse CSV file (semicolon-delimited)
function parseUserListCsv(filePath: string): CsvUserData[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const users: CsvUserData[] = [];

  // Skip header row (first line): Name;Email;Role;Branch;ERP;QIMS Login;Lucatris;Remark
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(';');

    if (parts.length >= 2) {
      const name = parts[0].trim();
      const email = parts[1].trim();
      const role = parts[2]?.trim() || '';
      const branch = parts[3]?.trim() || '';

      // Only add users with valid email addresses
      if (email && email.includes('@')) {
        users.push({
          name,
          email,
          role,
          branch
        });
      }
    }
  }

  return users;
}

// Function to normalize strings for comparison (case-insensitive, trim whitespace)
function normalizeString(str: string): string {
  return str.toLowerCase().trim();
}

// Function to generate progressive search keywords from a name
// e.g., "Yan Adams Berlian S" -> ["Yan", "Yan Adams", "Yan Adams Berlian", "Yan Adams Berlian S"]
function generateProgressiveKeywords(name: string): string[] {
  const parts = name.trim().split(/\s+/);
  const keywords: string[] = [];

  for (let i = 1; i <= parts.length; i++) {
    keywords.push(parts.slice(0, i).join(' '));
  }

  return keywords;
}

test('QIMS Check Existing Users from CSV', async ({ page }) => {
  // Set longer timeout for testing all users (45 minutes)
  test.setTimeout(2700000);

  // Read users from CSV file
  const userListPath = path.join(__dirname, '..', 'data', 'new_users_list.csv');
  const csvUsers = parseUserListCsv(userListPath);

  console.log(`\n========================================`);
  console.log(`QIMS User Existence Check`);
  console.log(`Total users to check: ${csvUsers.length}`);
  console.log(`========================================\n`);

  const results: UserComparisonResult[] = [];
  const loginEmail = 'aan.pujihidayat@radiant-utama.com';
  const loginPassword = 'rui123';

  // Step 1: Login to QIMS
  console.log('Logging in to QIMS...');
  await page.goto('http://5.223.61.214:3000/sign-in', { timeout: 60000 });
  await page.getByRole('textbox', { name: 'Email' }).fill(loginEmail);
  await page.getByRole('textbox', { name: 'Password' }).fill(loginPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for login to complete
  await page.waitForTimeout(3000);

  // Verify login success
  const currentUrl = page.url();
  if (currentUrl.includes('sign-in')) {
    throw new Error('Login failed - still on sign-in page');
  }
  console.log('Login successful!\n');

  // Step 2: Navigate to User Management
  console.log('Navigating to User Management...');
  await page.getByRole('link', { name: 'User Management' }).click();
  await page.waitForTimeout(2000);
  console.log('User Management page loaded.\n');

  // Step 3: Check each user from CSV
  for (let i = 0; i < csvUsers.length; i++) {
    const csvUser = csvUsers[i];
    console.log(`[${i + 1}/${csvUsers.length}] Checking: ${csvUser.name} (${csvUser.email})`);

    try {
      // Generate progressive search keywords from the name
      // e.g., "Yan Adams Berlian S" -> ["Yan", "Yan Adams", "Yan Adams Berlian", "Yan Adams Berlian S"]
      const searchKeywords = generateProgressiveKeywords(csvUser.name);

      const searchBox = page.getByRole('searchbox', { name: 'Filter...' });
      let qimsData: QimsUserData | null = null;
      let found = false;
      let remark = 'NOT FOUND in QIMS';
      let matchedKeyword = '';

      // Try each progressive keyword until a match is found
      for (const keyword of searchKeywords) {
        await searchBox.click();
        await searchBox.clear();
        await searchBox.fill(keyword);
        await page.waitForTimeout(1500); // Wait for search results

        // Look for matching row in the table
        const rows = page.locator('table tbody tr');
        const rowCount = await rows.count();

        // If there are search results, check if name is similar
        if (rowCount > 0) {
          for (let j = 0; j < rowCount; j++) {
            const row = rows.nth(j);
            const cells = row.locator('td');
            const cellCount = await cells.count();

            if (cellCount >= 4) {
              // Extract cell text - table structure: ID, Name, Email, Role, Branch
              const rowName = await cells.nth(1).innerText().catch(() => '');
              const rowEmail = await cells.nth(2).innerText().catch(() => '');
              const rowRole = await cells.nth(3).innerText().catch(() => '');
              const rowBranch = await cells.nth(4).innerText().catch(() => '');
              const rowStatus = cellCount >= 6 ? await cells.nth(5).innerText().catch(() => '') : '';

              // Match by name similarity (case-insensitive) - if QIMS name contains keyword or vice versa
              const keywordNorm = normalizeString(keyword);
              const qimsNameNorm = normalizeString(rowName);

              if (qimsNameNorm.includes(keywordNorm) || keywordNorm.includes(qimsNameNorm) ||
                  qimsNameNorm === keywordNorm) {
                found = true;
                matchedKeyword = keyword;
                qimsData = {
                  name: rowName.trim(),
                  email: rowEmail.trim(),
                  role: rowRole.trim(),
                  branch: rowBranch.trim(),
                  status: rowStatus.trim()
                };

                // Generate remark with matched keyword info
                remark = `FOUND in QIMS (matched: "${keyword}")`;
                break;
              }
            }
          }
        }

        // If found, stop searching with more keywords
        if (found) {
          break;
        }
      }

      results.push({
        csvData: csvUser,
        qimsData,
        found,
        remark
      });

      if (found) {
        console.log(`  ✓ FOUND - ${qimsData?.name} | ${qimsData?.email} | Role: ${qimsData?.role} | Branch: ${qimsData?.branch} | Status: ${qimsData?.status}`);
      } else {
        console.log(`  ✗ NOT FOUND`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ ERROR - ${errorMessage}`);
      results.push({
        csvData: csvUser,
        qimsData: null,
        found: false,
        remark: `ERROR: ${errorMessage}`
      });

      // Check if browser closed
      if (errorMessage.includes('Target page, context or browser has been closed') ||
          errorMessage.includes('Protocol error')) {
        console.log('  Browser closed unexpectedly, saving partial results...');
        break;
      }
    }

    // Small delay between searches
    await page.waitForTimeout(500);
  }

  // Save results to markdown file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsDir = path.join(__dirname, '..', 'test-results');

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const resultsFile = path.join(resultsDir, `qims-user-check-results-${timestamp}.md`);

  const foundUsers = results.filter(r => r.found);
  const notFoundUsers = results.filter(r => !r.found);

  let mdContent = `# QIMS User Existence Check Results\n\n`;
  mdContent += `**Date:** ${new Date().toISOString()}\n\n`;
  mdContent += `**CSV Source:** new_users_list.csv\n\n`;
  mdContent += `## Summary\n\n`;
  mdContent += `| Metric | Count |\n`;
  mdContent += `|--------|-------|\n`;
  mdContent += `| Total Checked | ${results.length} |\n`;
  mdContent += `| Found in QIMS | ${foundUsers.length} |\n`;
  mdContent += `| Not Found in QIMS | ${notFoundUsers.length} |\n\n`;

  // All results table
  mdContent += `## Complete Results\n\n`;
  mdContent += `| No | CSV Name | CSV Email | CSV Role | CSV Branch | Found | QIMS Name | QIMS Email | QIMS Role | QIMS Branch | QIMS Status | Remark |\n`;
  mdContent += `|----|----------|-----------|----------|------------|-------|-----------|------------|-----------|-------------|-------------|--------|\n`;
  results.forEach((r, idx) => {
    const qName = r.qimsData?.name || '-';
    const qEmail = r.qimsData?.email || '-';
    const qRole = r.qimsData?.role || '-';
    const qBranch = r.qimsData?.branch || '-';
    const qStatus = r.qimsData?.status || '-';
    const foundStr = r.found ? 'YES' : 'NO';
    mdContent += `| ${idx + 1} | ${r.csvData.name} | ${r.csvData.email} | ${r.csvData.role || '-'} | ${r.csvData.branch || '-'} | ${foundStr} | ${qName} | ${qEmail} | ${qRole} | ${qBranch} | ${qStatus} | ${r.remark} |\n`;
  });
  mdContent += `\n`;

  // Found users section
  if (foundUsers.length > 0) {
    mdContent += `## Found Users (${foundUsers.length})\n\n`;
    mdContent += `| No | Name | Email | Role | Branch | Status | Remark |\n`;
    mdContent += `|----|------|-------|------|--------|--------|--------|\n`;
    foundUsers.forEach((r, idx) => {
      mdContent += `| ${idx + 1} | ${r.qimsData?.name} | ${r.qimsData?.email} | ${r.qimsData?.role || '-'} | ${r.qimsData?.branch || '-'} | ${r.qimsData?.status || '-'} | ${r.remark} |\n`;
    });
    mdContent += `\n`;
  }

  // Not found users section
  if (notFoundUsers.length > 0) {
    mdContent += `## Not Found Users (${notFoundUsers.length})\n\n`;
    mdContent += `| No | Name | Email | Role | Branch | Remark |\n`;
    mdContent += `|----|------|-------|------|--------|--------|\n`;
    notFoundUsers.forEach((r, idx) => {
      mdContent += `| ${idx + 1} | ${r.csvData.name} | ${r.csvData.email} | ${r.csvData.role || '-'} | ${r.csvData.branch || '-'} | ${r.remark} |\n`;
    });
    mdContent += `\n`;
  }

  fs.writeFileSync(resultsFile, mdContent);

  // Also update the original CSV with QIMS check results
  const updatedCsvPath = path.join(__dirname, '..', 'data', `new_users_list_checked_${timestamp}.csv`);
  let csvContent = 'Name;Email;Role;Branch;Found;QIMS Name;QIMS Email;QIMS Role;QIMS Branch;QIMS Status;Remark\n';
  results.forEach(r => {
    const qName = r.qimsData?.name || '';
    const qEmail = r.qimsData?.email || '';
    const qRole = r.qimsData?.role || '';
    const qBranch = r.qimsData?.branch || '';
    const qStatus = r.qimsData?.status || '';
    const foundStr = r.found ? 'YES' : 'NO';
    csvContent += `${r.csvData.name};${r.csvData.email};${r.csvData.role};${r.csvData.branch};${foundStr};${qName};${qEmail};${qRole};${qBranch};${qStatus};${r.remark}\n`;
  });
  fs.writeFileSync(updatedCsvPath, csvContent);

  // Print summary
  console.log(`\n========================================`);
  console.log(`CHECK COMPLETE`);
  console.log(`========================================`);
  console.log(`Total checked: ${results.length}`);
  console.log(`Found in QIMS: ${foundUsers.length}`);
  console.log(`Not found in QIMS: ${notFoundUsers.length}`);
  console.log(`Results saved to: ${resultsFile}`);
  console.log(`Updated CSV saved to: ${updatedCsvPath}`);
  console.log(`========================================\n`);

  // Assert at least some checks ran
  expect(results.length).toBeGreaterThan(0);
});