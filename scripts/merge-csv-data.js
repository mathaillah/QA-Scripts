const fs = require('fs');
const path = require('path');

// Read source file
const sourceFile = path.join(__dirname, '..', 'data', 'Rekap List User 27-01-2026.csv');
const testResultsFile = path.join(__dirname, '..', 'test-results', 'login-results-with-qims-email-2026-01-28_13-23-44.csv');

const sourceContent = fs.readFileSync(sourceFile, 'utf-8');
const testResultsContent = fs.readFileSync(testResultsFile, 'utf-8');

// Parse test results into lookup map by email
const testResultsLines = testResultsContent.split('\n');
const testResultsMap = new Map();

// Header: Name;Email;Role;Branch;QIMS Login Test;Lucatris Login Test;Email Exist on QIMS;Email Registered on QIMS;QIMS Role;QIMS Branch;QIMS Status;Remark
for (let i = 1; i < testResultsLines.length; i++) {
  const line = testResultsLines[i].trim();
  if (!line) continue;

  const parts = line.split(';');
  if (parts.length >= 2) {
    const email = (parts[1] || '').toLowerCase().trim();
    if (email) {
      testResultsMap.set(email, {
        qimsLoginTest: parts[4] || '',
        lucatrisLoginTest: parts[5] || '',
        emailExistOnQims: parts[6] || '',
        emailRegisteredOnQims: parts[7] || '',
        qimsRole: parts[8] || '',
        qimsBranch: parts[9] || '',
        qimsStatus: parts[10] || '',
        remark: parts[11] || ''
      });
    }
  }
}

console.log(`Loaded ${testResultsMap.size} entries from test results`);

// Parse source file and merge
const sourceLines = sourceContent.split('\n');
let outputLines = [];

// New header
const newHeader = 'Name;Email;Role;Branch;Original Remark;QIMS Login Test;Lucatris Login Test;Email Exist on QIMS;Email Registered on QIMS;QIMS Role;QIMS Branch;QIMS Status;Merge Remark';
outputLines.push(newHeader);

let matchCount = 0;
let noMatchCount = 0;

for (let i = 1; i < sourceLines.length; i++) {
  const line = sourceLines[i].trim();
  if (!line) continue;

  // Remove BOM if present
  const cleanLine = line.replace(/^\uFEFF/, '');
  const parts = cleanLine.split(';');

  const name = (parts[0] || '').trim();
  const email = (parts[1] || '').toLowerCase().trim();
  const role = (parts[2] || '').trim();
  const branch = (parts[3] || '').trim();
  const originalRemark = (parts[4] || '').trim();

  // Look up test results
  const testResult = testResultsMap.get(email);

  let qimsLoginTest = '';
  let lucatrisLoginTest = '';
  let emailExistOnQims = '';
  let emailRegisteredOnQims = '';
  let qimsRole = '';
  let qimsBranch = '';
  let qimsStatus = '';
  let mergeRemark = '';

  if (testResult) {
    qimsLoginTest = testResult.qimsLoginTest;
    lucatrisLoginTest = testResult.lucatrisLoginTest;
    emailExistOnQims = testResult.emailExistOnQims;
    emailRegisteredOnQims = testResult.emailRegisteredOnQims;
    qimsRole = testResult.qimsRole;
    qimsBranch = testResult.qimsBranch;
    qimsStatus = testResult.qimsStatus;
    mergeRemark = testResult.remark;
    matchCount++;
  } else {
    if (email) {
      mergeRemark = 'Email not found in test results';
    } else {
      mergeRemark = 'No email provided';
    }
    noMatchCount++;
  }

  const outputLine = `${name};${parts[1] || ''};${role};${branch};${originalRemark};${qimsLoginTest};${lucatrisLoginTest};${emailExistOnQims};${emailRegisteredOnQims};${qimsRole};${qimsBranch};${qimsStatus};${mergeRemark}`;
  outputLines.push(outputLine);
}

// Write output file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outputFile = path.join(__dirname, '..', 'data', `Rekap-List-User-with-QIMS-data-${timestamp}.csv`);

fs.writeFileSync(outputFile, outputLines.join('\n'), 'utf-8');

console.log(`\nMerge complete:`);
console.log(`  - Matched: ${matchCount}`);
console.log(`  - Not matched: ${noMatchCount}`);
console.log(`  - Output file: ${outputFile}`);
