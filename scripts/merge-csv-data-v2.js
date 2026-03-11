const fs = require('fs');
const path = require('path');

// Read source file
const sourceFile = path.join(__dirname, '..', 'data', 'Rekap List User 27-01-2026.csv');
const testResultsFile = path.join(__dirname, '..', 'test-results', 'login-results-with-qims-email-2026-01-28_13-23-44.csv');
const qimsUsersFile = path.join(__dirname, '..', 'test-results', 'qims-users-list-2026-01-28_13-23-44.csv');

const sourceContent = fs.readFileSync(sourceFile, 'utf-8');
const testResultsContent = fs.readFileSync(testResultsFile, 'utf-8');
const qimsUsersContent = fs.readFileSync(qimsUsersFile, 'utf-8');

// Parse test results into lookup map by email
const testResultsLines = testResultsContent.split('\n');
const testResultsMapByEmail = new Map();
const testResultsMapByName = new Map();

for (let i = 1; i < testResultsLines.length; i++) {
  const line = testResultsLines[i].trim();
  if (!line) continue;

  const parts = line.split(';');
  if (parts.length >= 2) {
    const name = (parts[0] || '').toLowerCase().trim();
    const email = (parts[1] || '').toLowerCase().trim();
    const data = {
      name: parts[0] || '',
      email: parts[1] || '',
      qimsLoginTest: parts[4] || '',
      lucatrisLoginTest: parts[5] || '',
      emailExistOnQims: parts[6] || '',
      emailRegisteredOnQims: parts[7] || '',
      qimsRole: parts[8] || '',
      qimsBranch: parts[9] || '',
      qimsStatus: parts[10] || '',
      remark: parts[11] || ''
    };

    if (email) {
      testResultsMapByEmail.set(email, data);
    }
    if (name) {
      testResultsMapByName.set(name, data);
    }
  }
}

// Parse QIMS users list for additional lookup
const qimsUsersLines = qimsUsersContent.split('\n');
const qimsUsersMapByEmail = new Map();
const qimsUsersMapByName = new Map();

// Header: ID;Name;Email;Role;Branch;Status
for (let i = 1; i < qimsUsersLines.length; i++) {
  const line = qimsUsersLines[i].trim();
  if (!line) continue;

  const parts = line.split(';');
  if (parts.length >= 3) {
    const name = (parts[1] || '').toLowerCase().trim();
    const email = (parts[2] || '').toLowerCase().trim();
    const data = {
      id: parts[0] || '',
      name: parts[1] || '',
      email: parts[2] || '',
      role: parts[3] || '',
      branch: parts[4] || '',
      status: parts[5] || ''
    };

    if (email) {
      qimsUsersMapByEmail.set(email, data);
    }
    if (name) {
      qimsUsersMapByName.set(name, data);
    }
  }
}

console.log(`Loaded ${testResultsMapByEmail.size} entries from test results`);
console.log(`Loaded ${qimsUsersMapByEmail.size} entries from QIMS users list`);

// Normalize name for matching
function normalizeName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse source file and merge
const sourceLines = sourceContent.split('\n');
let outputLines = [];

// New header
const newHeader = 'Name;Email;Role;Branch;Original Remark;QIMS Login Test;Lucatris Login Test;Email Exist on QIMS;Email Registered on QIMS;QIMS Role;QIMS Branch;QIMS Status;Merge Remark';
outputLines.push(newHeader);

let exactMatchCount = 0;
let nameMatchCount = 0;
let noMatchCount = 0;

for (let i = 1; i < sourceLines.length; i++) {
  const line = sourceLines[i].trim();
  if (!line) continue;

  // Remove BOM if present
  const cleanLine = line.replace(/^\uFEFF/, '');
  const parts = cleanLine.split(';');

  const name = (parts[0] || '').trim();
  const email = (parts[1] || '').trim();
  const role = (parts[2] || '').trim();
  const branch = (parts[3] || '').trim();
  const originalRemark = (parts[4] || '').trim();

  const emailLower = email.toLowerCase();
  const nameLower = name.toLowerCase();
  const nameNormalized = normalizeName(name);

  let qimsLoginTest = '';
  let lucatrisLoginTest = '';
  let emailExistOnQims = '';
  let emailRegisteredOnQims = '';
  let qimsRole = '';
  let qimsBranch = '';
  let qimsStatus = '';
  let mergeRemark = '';

  // Try exact email match first
  let testResult = testResultsMapByEmail.get(emailLower);

  if (testResult) {
    qimsLoginTest = testResult.qimsLoginTest;
    lucatrisLoginTest = testResult.lucatrisLoginTest;
    emailExistOnQims = testResult.emailExistOnQims;
    emailRegisteredOnQims = testResult.emailRegisteredOnQims;
    qimsRole = testResult.qimsRole;
    qimsBranch = testResult.qimsBranch;
    qimsStatus = testResult.qimsStatus;
    mergeRemark = testResult.remark;
    exactMatchCount++;
  } else {
    // Try to find by name in test results
    testResult = testResultsMapByName.get(nameLower);

    if (!testResult) {
      // Try normalized name match
      for (const [key, val] of testResultsMapByName) {
        if (normalizeName(key) === nameNormalized) {
          testResult = val;
          break;
        }
      }
    }

    if (testResult) {
      qimsLoginTest = testResult.qimsLoginTest;
      lucatrisLoginTest = testResult.lucatrisLoginTest;
      emailExistOnQims = testResult.emailExistOnQims;
      emailRegisteredOnQims = testResult.emailRegisteredOnQims;
      qimsRole = testResult.qimsRole;
      qimsBranch = testResult.qimsBranch;
      qimsStatus = testResult.qimsStatus;
      mergeRemark = `Matched by name (test email: ${testResult.email})`;
      nameMatchCount++;
    } else {
      // Try to find in QIMS users list by name
      let qimsUser = qimsUsersMapByName.get(nameLower);

      if (!qimsUser) {
        // Try normalized name match
        for (const [key, val] of qimsUsersMapByName) {
          if (normalizeName(key) === nameNormalized) {
            qimsUser = val;
            break;
          }
        }
      }

      if (qimsUser) {
        emailExistOnQims = 'YES';
        emailRegisteredOnQims = qimsUser.email;
        qimsRole = qimsUser.role;
        qimsBranch = qimsUser.branch;
        qimsStatus = qimsUser.status;
        mergeRemark = `Found in QIMS by name (QIMS email: ${qimsUser.email})`;
        nameMatchCount++;
      } else {
        if (email) {
          mergeRemark = 'Email not found in test results or QIMS';
        } else {
          mergeRemark = 'No email provided';
        }
        noMatchCount++;
      }
    }
  }

  const outputLine = `${name};${email};${role};${branch};${originalRemark};${qimsLoginTest};${lucatrisLoginTest};${emailExistOnQims};${emailRegisteredOnQims};${qimsRole};${qimsBranch};${qimsStatus};${mergeRemark}`;
  outputLines.push(outputLine);
}

// Write output file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outputFile = path.join(__dirname, '..', 'data', `Rekap-List-User-with-QIMS-data-${timestamp}.csv`);

fs.writeFileSync(outputFile, outputLines.join('\n'), 'utf-8');

console.log(`\nMerge complete:`);
console.log(`  - Exact email match: ${exactMatchCount}`);
console.log(`  - Name match (with QIMS email): ${nameMatchCount}`);
console.log(`  - No match: ${noMatchCount}`);
console.log(`  - Output file: ${outputFile}`);
