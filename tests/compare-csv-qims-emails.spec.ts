import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Interface for CSV user data
interface CsvUserData {
  name: string;
  email: string;
  role: string;
  branch: string;
  qimsStatus: string;
  lucatrisStatus: string;
}

// Interface for QIMS user data from website
interface QimsWebUserData {
  id: string;
  name: string;
  email: string;
  role: string;
  branch: string;
  status: string;
}

// Interface for comparison result
interface ComparisonResult {
  email: string;
  name: string;
  branch: string;
  inCsv: boolean;
  inQims: boolean;
  csvQimsStatus: string;
  remark: string;
}

// Parse the original user CSV (Name;Email;Role;Branch;ERP;QIMS Login;Lucatris Login;Remark)
function parseLoginResultsCsv(filePath: string): CsvUserData[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const users: CsvUserData[] = [];

  // Skip header: Name;Email;Role;Branch;ERP;QIMS Login;Lucatris Login;Remark
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(';');
    if (parts.length >= 2) {
      const email = parts[1]?.trim() || '';
      if (email && email.includes('@')) {
        users.push({
          name: parts[0]?.trim() || '',
          email: email.toLowerCase(),
          role: parts[2]?.trim() || '',
          branch: parts[3]?.trim() || '',
          qimsStatus: parts[5]?.trim() || '',  // QIMS Login is column 5
          lucatrisStatus: parts[6]?.trim() || '',  // Lucatris Login is column 6
        });
      }
    }
  }

  return users;
}

test('Compare CSV emails with QIMS website users', async ({ page }) => {
  test.setTimeout(1800000); // 30 minutes

  const csvPath = path.join(__dirname, '..', 'data', 'user-qims-regu-updated-2026-01-28.csv');
  const csvUsers = parseLoginResultsCsv(csvPath);

  console.log(`\n========================================`);
  console.log(`CSV vs QIMS EMAIL COMPARISON`);
  console.log(`========================================`);
  console.log(`CSV users to compare: ${csvUsers.length}`);
  console.log(`========================================\n`);

  // Login credentials
  const loginEmail = 'aan.pujihidayat@radiant-utama.com';
  const loginPassword = 'rui123';

  // Step 1: Login to QIMS
  console.log('Logging in to QIMS as aan...');
  await page.goto('http://5.223.61.214:3000/sign-in', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await page.getByRole('textbox', { name: 'Email' }).fill(loginEmail);
  await page.getByRole('textbox', { name: 'Password' }).fill(loginPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for navigation after login
  await page.waitForTimeout(5000);

  // Check login success - try to navigate to dashboard directly
  const currentUrl = page.url();
  if (currentUrl.includes('sign-in')) {
    // Try once more with different approach
    console.log('First login attempt failed, retrying...');
    await page.reload();
    await page.waitForTimeout(2000);
    await page.getByRole('textbox', { name: 'Email' }).fill(loginEmail);
    await page.getByRole('textbox', { name: 'Password' }).fill(loginPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForTimeout(5000);

    if (page.url().includes('sign-in')) {
      throw new Error('Login failed after retry - check credentials for aan.pujihidayat@radiant-utama.com');
    }
  }
  console.log('Login successful!\n');

  // Step 2: Navigate to User Management (dashboard/users)
  console.log('Navigating to User Management...');
  await page.goto('http://5.223.61.214:3000/dashboard/users', { timeout: 60000 });
  await page.waitForTimeout(3000);
  console.log('User Management page loaded.\n');

  // Step 3: Collect all users from QIMS website
  console.log('Fetching all users from QIMS...');
  const qimsUsers: QimsWebUserData[] = [];

  // Set page size to maximum if available
  try {
    const pageSizeSelector = page.locator('select').first();
    if (await pageSizeSelector.isVisible()) {
      await pageSizeSelector.selectOption({ label: '100' }).catch(() => {});
      await page.waitForTimeout(2000);
    }
  } catch {
    console.log('Could not change page size, using default.');
  }

  let pageNum = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    console.log(`  Fetching page ${pageNum}...`);

    // Get table rows
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    console.log(`  Found ${rowCount} rows on page ${pageNum}`);

    for (let i = 0; i < rowCount; i++) {
      try {
        const row = rows.nth(i);
        const cells = row.locator('td');
        const cellCount = await cells.count();

        if (cellCount >= 4) {
          // Table structure: checkbox, ID/Name, Email, Role, Branch, Status, Actions
          // or: ID, Name, Email, Role, Branch, Status
          let idVal = '';
          let nameVal = '';
          let emailVal = '';
          let roleVal = '';
          let branchVal = '';
          let statusVal = '';

          // Try to detect table structure by checking first few cells
          const cell0Text = await cells.nth(0).innerText().catch(() => '');
          const cell1Text = await cells.nth(1).innerText().catch(() => '');
          const cell2Text = await cells.nth(2).innerText().catch(() => '');

          // If cell1 contains @, it's the email column
          if (cell1Text.includes('@')) {
            // Structure: Name, Email, Role, Branch, Status
            nameVal = cell0Text;
            emailVal = cell1Text;
            roleVal = await cells.nth(2).innerText().catch(() => '');
            branchVal = await cells.nth(3).innerText().catch(() => '');
            statusVal = cellCount >= 5 ? await cells.nth(4).innerText().catch(() => '') : '';
          } else if (cell2Text.includes('@')) {
            // Structure: ID, Name, Email, Role, Branch, Status
            idVal = cell0Text;
            nameVal = cell1Text;
            emailVal = cell2Text;
            roleVal = await cells.nth(3).innerText().catch(() => '');
            branchVal = await cells.nth(4).innerText().catch(() => '');
            statusVal = cellCount >= 6 ? await cells.nth(5).innerText().catch(() => '') : '';
          } else {
            // Try other patterns - check cell3
            const cell3Text = await cells.nth(3).innerText().catch(() => '');
            if (cell3Text.includes('@')) {
              // Structure with checkbox: Checkbox, ID, Name, Email, Role, Branch, Status
              idVal = cell1Text;
              nameVal = cell2Text;
              emailVal = cell3Text;
              roleVal = await cells.nth(4).innerText().catch(() => '');
              branchVal = await cells.nth(5).innerText().catch(() => '');
              statusVal = cellCount >= 7 ? await cells.nth(6).innerText().catch(() => '') : '';
            }
          }

          if (emailVal && emailVal.includes('@')) {
            qimsUsers.push({
              id: idVal.trim(),
              name: nameVal.trim(),
              email: emailVal.trim().toLowerCase(),
              role: roleVal.trim(),
              branch: branchVal.trim(),
              status: statusVal.trim(),
            });
          }
        }
      } catch (err) {
        // Skip problematic rows
      }
    }

    // Check for next page
    try {
      const nextButton = page.getByRole('button', { name: /next/i }).or(page.locator('button:has-text(">")')).or(page.locator('[aria-label="Go to next page"]'));
      const isNextDisabled = await nextButton.isDisabled().catch(() => true);

      if (!isNextDisabled && await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(2000);
        pageNum++;

        // Safety limit
        if (pageNum > 50) {
          console.log('  Reached page limit (50), stopping pagination.');
          hasNextPage = false;
        }
      } else {
        hasNextPage = false;
      }
    } catch {
      hasNextPage = false;
    }
  }

  console.log(`\nTotal users fetched from QIMS: ${qimsUsers.length}`);

  // Remove duplicates from QIMS users
  const uniqueQimsEmails = new Map<string, QimsWebUserData>();
  for (const user of qimsUsers) {
    if (!uniqueQimsEmails.has(user.email)) {
      uniqueQimsEmails.set(user.email, user);
    }
  }
  console.log(`Unique QIMS emails: ${uniqueQimsEmails.size}`);

  // Step 4: Compare emails
  console.log('\nComparing emails...');

  const csvEmailSet = new Set(csvUsers.map(u => u.email));
  const qimsEmailSet = new Set(uniqueQimsEmails.keys());

  const results: ComparisonResult[] = [];

  // Check CSV users against QIMS
  for (const csvUser of csvUsers) {
    const inQims = qimsEmailSet.has(csvUser.email);
    let remark = '';

    if (inQims) {
      remark = 'EXISTS in QIMS';
    } else if (csvUser.qimsStatus === 'YES') {
      remark = 'CSV says YES but NOT FOUND in QIMS user list';
    } else if (csvUser.qimsStatus === 'NO') {
      remark = 'CSV says NO, confirmed NOT in QIMS';
    } else if (csvUser.qimsStatus === 'ERROR') {
      remark = 'CSV had ERROR, NOT in QIMS user list';
    } else {
      remark = 'NOT FOUND in QIMS';
    }

    results.push({
      email: csvUser.email,
      name: csvUser.name,
      branch: csvUser.branch,
      inCsv: true,
      inQims,
      csvQimsStatus: csvUser.qimsStatus,
      remark,
    });
  }

  // Check QIMS users not in CSV
  for (const [email, qimsUser] of uniqueQimsEmails) {
    if (!csvEmailSet.has(email)) {
      results.push({
        email,
        name: qimsUser.name,
        branch: qimsUser.branch,
        inCsv: false,
        inQims: true,
        csvQimsStatus: '-',
        remark: 'EXISTS in QIMS but NOT in CSV',
      });
    }
  }

  // Calculate statistics
  const inBoth = results.filter(r => r.inCsv && r.inQims);
  const onlyInCsv = results.filter(r => r.inCsv && !r.inQims);
  const onlyInQims = results.filter(r => !r.inCsv && r.inQims);
  const csvSaysYesButNotInQims = results.filter(r => r.inCsv && !r.inQims && r.csvQimsStatus === 'YES');
  const csvSaysNoConfirmed = results.filter(r => r.inCsv && !r.inQims && r.csvQimsStatus === 'NO');

  console.log(`\n========================================`);
  console.log(`COMPARISON COMPLETE`);
  console.log(`========================================`);
  console.log(`Total CSV emails: ${csvUsers.length}`);
  console.log(`Total QIMS emails: ${uniqueQimsEmails.size}`);
  console.log(`In Both: ${inBoth.length}`);
  console.log(`Only in CSV: ${onlyInCsv.length}`);
  console.log(`Only in QIMS: ${onlyInQims.length}`);
  console.log(`CSV says YES but NOT in QIMS: ${csvSaysYesButNotInQims.length}`);
  console.log(`========================================\n`);

  // Generate output files
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;

  const resultsDir = path.join(__dirname, '..', 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // Markdown report
  let md = `# CSV vs QIMS Email Comparison Report\n\n`;
  md += `**Date:** ${now.toISOString().split('T')[0]}\n`;
  md += `**Time:** ${now.toTimeString().split(' ')[0]}\n`;
  md += `**CSV Source:** data/user-qims-regu-updated-2026-01-28.csv\n`;
  md += `**QIMS Source:** http://5.223.61.214:3000/dashboard/users\n\n`;

  md += `---\n\n`;
  md += `## Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| Total CSV Emails | ${csvUsers.length} |\n`;
  md += `| Total QIMS Emails | ${uniqueQimsEmails.size} |\n`;
  md += `| Emails in Both | ${inBoth.length} |\n`;
  md += `| Only in CSV (not in QIMS) | ${onlyInCsv.length} |\n`;
  md += `| Only in QIMS (not in CSV) | ${onlyInQims.length} |\n`;
  md += `| CSV says QIMS=YES but NOT found | ${csvSaysYesButNotInQims.length} |\n`;
  md += `| CSV says QIMS=NO (confirmed) | ${csvSaysNoConfirmed.length} |\n\n`;

  md += `---\n\n`;
  md += `## Discrepancies: CSV says QIMS=YES but NOT in QIMS User List (${csvSaysYesButNotInQims.length})\n\n`;
  if (csvSaysYesButNotInQims.length > 0) {
    md += `| No | Name | Email | Branch | CSV QIMS Status |\n`;
    md += `|----|------|-------|--------|----------------|\n`;
    csvSaysYesButNotInQims.forEach((r, idx) => {
      md += `| ${idx + 1} | ${r.name} | ${r.email} | ${r.branch} | ${r.csvQimsStatus} |\n`;
    });
  } else {
    md += `No discrepancies found.\n`;
  }
  md += `\n`;

  md += `---\n\n`;
  md += `## Only in CSV - Not in QIMS (${onlyInCsv.length})\n\n`;
  if (onlyInCsv.length > 0) {
    md += `| No | Name | Email | Branch | CSV QIMS Status | Remark |\n`;
    md += `|----|------|-------|--------|----------------|--------|\n`;
    onlyInCsv.forEach((r, idx) => {
      md += `| ${idx + 1} | ${r.name} | ${r.email} | ${r.branch} | ${r.csvQimsStatus} | ${r.remark} |\n`;
    });
  } else {
    md += `All CSV emails found in QIMS.\n`;
  }
  md += `\n`;

  md += `---\n\n`;
  md += `## Only in QIMS - Not in CSV (${onlyInQims.length})\n\n`;
  if (onlyInQims.length > 0) {
    md += `| No | Name | Email | Branch |\n`;
    md += `|----|------|-------|--------|\n`;
    onlyInQims.forEach((r, idx) => {
      md += `| ${idx + 1} | ${r.name} | ${r.email} | ${r.branch} |\n`;
    });
  } else {
    md += `All QIMS emails found in CSV.\n`;
  }
  md += `\n`;

  md += `---\n\n`;
  md += `## Emails Found in Both CSV and QIMS (${inBoth.length})\n\n`;
  if (inBoth.length > 0) {
    md += `| No | Name | Email | Branch |\n`;
    md += `|----|------|-------|--------|\n`;
    inBoth.forEach((r, idx) => {
      md += `| ${idx + 1} | ${r.name} | ${r.email} | ${r.branch} |\n`;
    });
  }
  md += `\n`;

  md += `---\n\n`;
  md += `## All QIMS Users Fetched (${uniqueQimsEmails.size})\n\n`;
  md += `| No | Name | Email | Role | Branch | Status |\n`;
  md += `|----|------|-------|------|--------|--------|\n`;
  let qIdx = 0;
  for (const [, user] of uniqueQimsEmails) {
    qIdx++;
    md += `| ${qIdx} | ${user.name} | ${user.email} | ${user.role} | ${user.branch} | ${user.status} |\n`;
  }
  md += `\n`;

  const mdPath = path.join(resultsDir, `csv-qims-comparison-${timestamp}.md`);
  fs.writeFileSync(mdPath, md);
  console.log(`Markdown report saved to: ${mdPath}`);

  // CSV output - comparison results
  let csv = `Email;Name;Branch;In CSV;In QIMS;CSV QIMS Status;Remark\n`;
  for (const r of results) {
    csv += `${r.email};${r.name};${r.branch};${r.inCsv ? 'YES' : 'NO'};${r.inQims ? 'YES' : 'NO'};${r.csvQimsStatus};${r.remark}\n`;
  }
  const csvOutputPath = path.join(resultsDir, `csv-qims-comparison-${timestamp}.csv`);
  fs.writeFileSync(csvOutputPath, csv);
  console.log(`CSV saved to: ${csvOutputPath}`);

  // Create updated CSV with "Email Registered on QIMS" showing actual QIMS email
  let updatedCsv = `Name;Email;Role;Branch;QIMS Login Test;Lucatris Login Test;Email Exist on QIMS;Email Registered on QIMS;QIMS Role;QIMS Branch;QIMS Status;Remark\n`;
  for (const csvUser of csvUsers) {
    const existsInQims = qimsEmailSet.has(csvUser.email);
    const qimsUser = uniqueQimsEmails.get(csvUser.email);
    const qimsEmail = qimsUser?.email || '';  // Show actual QIMS email address
    const qimsRole = qimsUser?.role || '';
    const qimsBranch = qimsUser?.branch || '';
    const qimsStatus = qimsUser?.status || '';
    let remark = '';
    if (csvUser.qimsStatus === 'YES' && !existsInQims) {
      remark = 'Login OK but email not in user list';
    } else if (csvUser.qimsStatus === 'NO' && existsInQims) {
      remark = 'Login failed but email exists in QIMS';
    } else if (csvUser.qimsStatus === 'ERROR') {
      remark = 'Login test had error';
    }
    updatedCsv += `${csvUser.name};${csvUser.email};${csvUser.role};${csvUser.branch};${csvUser.qimsStatus};${csvUser.lucatrisStatus};${existsInQims ? 'YES' : 'NO'};${qimsEmail};${qimsRole};${qimsBranch};${qimsStatus};${remark}\n`;
  }
  // Save with timestamp
  const updatedCsvPath = path.join(resultsDir, `login-results-with-qims-email-${timestamp}.csv`);
  fs.writeFileSync(updatedCsvPath, updatedCsv);
  console.log(`Updated CSV with QIMS email saved to: ${updatedCsvPath}`);

  // QIMS users list CSV
  let qimsCsv = `ID;Name;Email;Role;Branch;Status\n`;
  for (const [, user] of uniqueQimsEmails) {
    qimsCsv += `${user.id};${user.name};${user.email};${user.role};${user.branch};${user.status}\n`;
  }
  const qimsCsvPath = path.join(resultsDir, `qims-users-list-${timestamp}.csv`);
  fs.writeFileSync(qimsCsvPath, qimsCsv);
  console.log(`QIMS users list saved to: ${qimsCsvPath}`);

  expect(results.length).toBeGreaterThan(0);
});
