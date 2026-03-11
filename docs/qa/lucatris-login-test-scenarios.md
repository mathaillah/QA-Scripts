# Lucatris Login Test Scenarios & Results

**Test Architect:** Quinn (QA Agent)
**Test Date:** 2026-01-26
**Application Under Test:** Lucatris (https://lucatris.com)
**Test Tool:** Playwright (TypeScript)
**Test Type:** Functional / Authentication / Bulk User Validation

---

## 1. Test Objective

Validate user authentication for QIMS Regulatory users against the Lucatris system using email/password credentials.

---

## 2. Test Scope

### In Scope
- User login authentication via email and password
- Bulk validation of 77 user accounts from CSV data source
- Login success/failure detection
- Error message capture for failed logins

### Out of Scope
- Password reset functionality
- User registration
- Multi-factor authentication
- Session management after login

---

## 3. Test Environment

| Component | Details |
|-----------|---------|
| **URL** | https://lucatris.com/auth |
| **Browser** | Chromium (via Playwright) |
| **Test Data Source** | `data/user qims regu.csv` |
| **Password** | `rui123` (standard test password) |

---

## 4. Test Scenarios

### TC-001: Valid User Login

| Field | Value |
|-------|-------|
| **Scenario ID** | TC-001 |
| **Scenario Name** | Valid User Login with Correct Credentials |
| **Priority** | High |
| **Type** | Positive |

**Given-When-Then:**
```gherkin
GIVEN the user is on the Lucatris login page (https://lucatris.com/auth)
  AND the user has a valid registered email address
  AND the user has the correct password
WHEN the user enters their email in the Email field
  AND the user enters their password in the Password field
  AND the user clicks the "Sign in" button
THEN the user should be redirected to the dashboard (/RBI/overview-regulatory)
  AND the URL should no longer contain "/auth"
```

**Test Steps:**
1. Navigate to https://lucatris.com/auth
2. Clear browser cookies and storage
3. Enter valid email in Email field
4. Enter password "rui123" in Password field
5. Click "Sign in" button
6. Wait for page navigation (3 seconds)
7. Verify URL does not contain "/auth"

**Expected Result:** User is logged in and redirected to dashboard

---

### TC-002: Invalid User Login - Account Not Found

| Field | Value |
|-------|-------|
| **Scenario ID** | TC-002 |
| **Scenario Name** | Login with Unregistered Email |
| **Priority** | High |
| **Type** | Negative |

**Given-When-Then:**
```gherkin
GIVEN the user is on the Lucatris login page
  AND the user has an email address not registered in the system
WHEN the user enters their email in the Email field
  AND the user enters a password in the Password field
  AND the user clicks the "Sign in" button
THEN the user should remain on the login page
  AND an error message should be displayed
```

**Expected Result:** Login fails, error message displayed

---

### TC-003: Invalid User Login - Blocked Account

| Field | Value |
|-------|-------|
| **Scenario ID** | TC-003 |
| **Scenario Name** | Login with Blocked/Disabled Account |
| **Priority** | Medium |
| **Type** | Negative |

**Given-When-Then:**
```gherkin
GIVEN the user is on the Lucatris login page
  AND the user's account has been blocked or disabled
WHEN the user enters their email in the Email field
  AND the user enters their password in the Password field
  AND the user clicks the "Sign in" button
THEN the user should remain on the login page
  AND an error message "Please Contact Your Customer Support" should be displayed
```

**Expected Result:** Login fails with customer support message

---

### TC-004: Invalid User Login - Incorrect Email Format

| Field | Value |
|-------|-------|
| **Scenario ID** | TC-004 |
| **Scenario Name** | Login with Incorrect Email Spelling |
| **Priority** | Medium |
| **Type** | Negative |

**Given-When-Then:**
```gherkin
GIVEN the user is on the Lucatris login page
  AND the user has an email with typo (wrong spelling)
WHEN the user enters the incorrect email in the Email field
  AND the user enters the correct password in the Password field
  AND the user clicks the "Sign in" button
THEN the user should remain on the login page
  AND an error message should be displayed
```

**Expected Result:** Login fails due to email mismatch

---

### TC-005: Bulk User Login Validation

| Field | Value |
|-------|-------|
| **Scenario ID** | TC-005 |
| **Scenario Name** | Bulk Validation of Multiple User Accounts |
| **Priority** | High |
| **Type** | Positive/Negative (Mixed) |

**Given-When-Then:**
```gherkin
GIVEN a CSV file containing multiple user records (Name, Email, Role, Branch)
  AND each user should have an active Lucatris account
WHEN the test iterates through each user record
  AND attempts to login with each email and standard password
THEN successful logins should be recorded with redirect URL
  AND failed logins should be recorded with error reason
  AND a summary report should be generated
```

**Expected Result:** Comprehensive report of all user login statuses

---

## 5. Test Data

### Data Source
- **File:** `data/user qims regu.csv`
- **Format:** Semicolon-delimited CSV
- **Columns:** Name;Email;Role;Branch;ERP;QIMS Login;Lucatris;Remark

### User Distribution by Branch

| Branch | Count |
|--------|-------|
| Batam | 11 |
| Jakarta | 51 |
| Surabaya | 13 |
| Duri | 7 |
| **Total** | **82** (77 with valid emails) |

---

## 6. Test Execution Results

### Summary

| Metric | Initial Test | After Retests |
|--------|--------------|---------------|
| **Total Users Tested** | 77 | 77 |
| **Successful Logins** | 67 | 72 |
| **Failed Logins** | 10 | 5 |
| **Pass Rate** | 87.0% | **93.5%** |

---

### Initial Test Results (2026-01-26 13:28)

| Status | Count | Percentage |
|--------|-------|------------|
| PASS | 67 | 87.0% |
| FAIL | 10 | 13.0% |

---

### Retest Results - Email Corrections Applied

**5 users fixed by correcting email addresses:**

| # | Name | Original Email | Corrected Email | Branch | Result |
|---|------|----------------|-----------------|--------|--------|
| 1 | Syambas HR | syambashr@radiant.com | syambashr@radiant-utama.com | Jakarta | PASS |
| 2 | Aries Satya Andita | aries.satya@radiant-utama.com | aris.satyaandita@radiant-utama.com | Jakarta | PASS |
| 3 | Ahmad Badrun | ahmad.badrun@radiant.co.id | ahmad.badrun@radiant-utama.com | Duri | PASS |
| 4 | Friezoc Alfriedzo | friezoc.alfriedzo@radiant-utama.com | friezoc.alfiredzo@radiant-utama.com | Jakarta | PASS |
| 5 | Borhanudin Harahab | borhanudin.harahab@radiant-utama.com | borhanuddin.harahab@radiant-utama.com | Jakarta | PASS |

---

### Final Failed Users (5 accounts)

| # | Name | Email | Role | Branch | Failure Reason | Root Cause |
|---|------|-------|------|--------|----------------|------------|
| 1 | Boby Safra Madona | boby.madona@radiant-utama.com | Inspector | Batam | Login failed | Account not created (CSV: tidak ada data) |
| 2 | Erizal | erizal@radiant-utama.com | Admin Proj | Batam | Login failed | Account not created (CSV: tidak ada data) |
| 3 | Mashudi | mashudi@radiant-utama.com | Inspector | Batam | Login failed | Account not created (CSV: tidak ada data) |
| 4 | Rizky Bahtiar Sidiq | rizky.sidiq@radiant-utama.com | - | Jakarta | Login failed | Account not setup |
| 5 | Andika Bagas Rismawan | andika.rismawan@radiant-utama.com | - | Jakarta | Login failed | Account not created (CSV: tidak ada data) |

---

## 7. Defects Identified

### DEF-001: Email Data Inconsistency

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Type** | Data Quality |
| **Description** | 5 user emails in CSV did not match the registered emails in Lucatris system |
| **Impact** | Users unable to login until email corrected |
| **Resolution** | CSV file updated with correct email addresses |

### DEF-002: Missing User Accounts

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Type** | Configuration |
| **Description** | 5 users listed in CSV do not have accounts created in Lucatris |
| **Impact** | Users cannot access the system |
| **Recommendation** | Create accounts for: Boby Safra Madona, Erizal, Mashudi, Rizky Bahtiar Sidiq, Andika Bagas Rismawan |

---

## 8. Test Metrics

### Pass/Fail by Branch (Final)

| Branch | Total | Pass | Fail | Pass Rate |
|--------|-------|------|------|-----------|
| Batam | 11 | 8 | 3 | 72.7% |
| Jakarta | 51 | 49 | 2 | 96.1% |
| Surabaya | 9 | 9 | 0 | 100% |
| Duri | 6 | 6 | 0 | 100% |
| **Total** | **77** | **72** | **5** | **93.5%** |

---

## 9. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Email typos in source data | High | Medium | Validate emails against ERP system |
| Account not provisioned | Medium | High | Sync user list with Lucatris admin |
| Different email domains | Medium | Medium | Standardize to @radiant-utama.com |

---

## 10. Recommendations

1. **Data Quality:** Implement email validation against ERP/Active Directory before adding to CSV
2. **Account Provisioning:** Create automated sync between user list and Lucatris account creation
3. **Standardization:** Use consistent email domain (@radiant-utama.com) for all users
4. **Regular Audits:** Schedule monthly user access validation tests
5. **Account Setup:** Create Lucatris accounts for the 5 remaining failed users

---

## 11. Test Artifacts

| Artifact | Location |
|----------|----------|
| Test Spec | `tests/lucatris-login-email.spec.ts` |
| Retest Spec | `tests/lucatris-login-retest.spec.ts` |
| Test Data | `data/user qims regu.csv` |
| Initial Results | `test-results/lucatris-login-results-*.md` |
| Retest Results | `test-results/lucatris-login-retest-*.md` |

---

## 12. Sign-Off

| Role | Name | Status | Date |
|------|------|--------|------|
| Test Architect | Quinn (QA Agent) | Completed | 2026-01-26 |
| Test Executor | James (Dev Agent) | Completed | 2026-01-26 |
| Reviewer | - | Pending | - |

---

**Document Version:** 1.0
**Last Updated:** 2026-01-26T14:30:00Z

