# QA Task Recap - QIMS & Lucatris User Management

**Date:** 2026-01-28
**Project:** playwright-dev.lucatris_regulatory
**QA Engineer:** Syaiful

---

## 1. Overview

This document summarizes all QA automation tasks performed for testing user login and user creation on two systems:
- **QIMS** (http://5.223.61.214:3000)
- **Lucatris** (https://lucatris.com)

---

## 2. Systems Under Test

### 2.1 QIMS System
- **URL:** http://5.223.61.214:3000
- **Sign-in Page:** http://5.223.61.214:3000/sign-in
- **User Dashboard:** http://5.223.61.214:3000/dashboard/users
- **Create User Page:** http://5.223.61.214:3000/dashboard/users/create

### 2.2 Lucatris System
- **URL:** https://lucatris.com
- **Auth Page:** https://lucatris.com/auth

---

## 3. Test Data

### 3.1 Data Files Used
| File | Description |
|------|-------------|
| `data/user qims regu.csv` | Original user list (154 users) |
| `data/new-users-only-2026-01-27.csv` | New users extracted for testing (102 users) |
| `data/new-users-tested-2026-01-27_17-41-55.csv` | Test results with login status |
| `data/qims-users-created-2026-01-27_23-42-16.csv` | Final QIMS creation results |
| `data/user-qims-regu-updated-2026-01-28.csv` | Updated master user list |

### 3.2 Data Structure (CSV Format)
```
Name;Email;Role;Branch;ERP;QIMS Login;Lucatris Login;Remark
```

### 3.3 Test Credentials
- **Password:** `rui123` (for all users)
- **Admin Account:** `aan.pujihidayat@radiant-utama.com`

---

## 4. Tasks Completed

### 4.1 Task 1: Login Testing for New Users (101 Users)

**Objective:** Test login functionality for 101 new users on both QIMS and Lucatris systems.

**Test File:** `tests/test-new-users-101.spec.ts`

**Test Steps:**
1. Read user data from CSV file
2. For each user:
   - Clear cookies/session
   - Navigate to login page
   - Enter email and password
   - Click Sign In button
   - Wait for response
   - Check URL to determine success/failure
   - Capture error message if failed
3. Update CSV with results
4. Generate markdown report

**Results:**
| System | Success | Failed | Total |
|--------|---------|--------|-------|
| QIMS | 30 | 72 | 102 |
| Lucatris | 29 | 73 | 102 |

**Output Files:**
- `data/new-users-tested-2026-01-27_17-41-55.csv`
- `test-results/new-users-101-test-2026-01-27_17-41-55.md`

---

### 4.2 Task 2: Bulk User Creation in QIMS (72 Users)

**Objective:** Create QIMS accounts for users who failed login test (not registered).

**Test File:** `tests/qims-create-users-bulk.spec.ts`

**Test Steps:**
1. Login as admin
2. Navigate to User Dashboard
3. For each user to create:
   - Go to Create User page
   - Click Full Name dropdown
   - Search for inspector by first name
   - Select user from dropdown
   - Press Escape to close dropdown
   - Fill email field
   - Select Position from dropdown
   - Press Escape to close dropdown
   - Fill Password and Confirm Password
   - Click Create button
   - Check for success/error
4. Update CSV with results
5. Generate markdown report

**Role to Position Mapping:**
| CSV Role | Website Position |
|----------|------------------|
| PM | PM |
| BOM | BOM |
| INSPECTOR | Inspector |
| LEAD OF BRANCH SUPPORTING | Branch Operation Manager |
| SENIOR INSPECTOR | Inspector |
| JUNIOR INSPECTOR | Inspector |
| ADMIN OPERATION | Admin |
| STAFF ADMIN | Admin |
| INSPECTION COORDINATOR | Other |
| TRAINEE | Other |
| TEKNISI | Other |
| STAFF ACCOUNTING | Other |
| STAFF HR & CASHIER | Other |
| SHE OFFICER | Other |
| WAREHOUSE & ASSET | Other |
| DOCUMENT CONTROL | Other |
| COORDINATOR FINANCE | Other |
| HELPER | Other |

**Results:**
| Status | Count |
|--------|-------|
| Created/Exists | 62 |
| Failed | 0 |
| Skipped (not in inspector list) | 10 |

**Output Files:**
- `data/qims-users-created-2026-01-27_23-42-16.csv`
- `test-results/qims-create-users-2026-01-27_23-42-16.md`

---

### 4.3 Task 3: Update Master User List

**Objective:** Merge new user test results into master user list.

**Input:** `data/user qims regu.csv` (154 existing users)
**Output:** `data/user-qims-regu-updated-2026-01-28.csv` (256 total users)

**Added:** 102 new users with QIMS Login and Lucatris Login status

---

## 5. Test Scenarios

### 5.1 Login Test Scenarios

#### TC-LOGIN-001: Successful Login
```gherkin
Given user has valid credentials in the system
When user navigates to login page
And user enters email and password
And user clicks Sign In button
Then user should be redirected to dashboard
And URL should not contain "/sign-in" or "/auth"
```

#### TC-LOGIN-002: Failed Login - User Not Found
```gherkin
Given user email is not registered in the system
When user navigates to login page
And user enters email and password
And user clicks Sign In button
Then user should remain on login page
And error message "User with email not found" should be displayed
```

#### TC-LOGIN-003: Failed Login - Wrong Password
```gherkin
Given user has valid email but wrong password
When user navigates to login page
And user enters email and wrong password
And user clicks Sign In button
Then user should remain on login page
And error message "Password not match" should be displayed
```

---

### 5.2 Create User Test Scenarios

#### TC-CREATE-001: Create User Successfully
```gherkin
Given admin is logged in
And admin is on Create User page
When admin selects inspector from Full Name dropdown
And admin enters email
And admin selects position from dropdown
And admin enters password and confirm password
And admin clicks Create button
Then user should be created successfully
And admin should be redirected to user list
```

#### TC-CREATE-002: Create User - Inspector Not Found
```gherkin
Given admin is logged in
And admin is on Create User page
When admin searches for inspector name
And inspector is not in the dropdown list
Then user creation should be skipped
And test should continue to next user
```

#### TC-CREATE-003: Create User - Multiple Inspector Matches
```gherkin
Given admin is logged in
And admin is on Create User page
When admin searches for inspector name
And multiple inspectors match the search
Then first matching inspector should be selected
And user creation should proceed
```

#### TC-CREATE-004: Create User - Already Exists
```gherkin
Given admin is logged in
And admin is on Create User page
When admin attempts to create user that already exists
Then error message should indicate user exists
And test should mark user as "already exists"
```

---

## 6. Page Object Elements

### 6.1 QIMS Login Page
```typescript
// URL: http://5.223.61.214:3000/sign-in
const emailField = page.getByRole('textbox', { name: 'Email' });
const passwordField = page.getByRole('textbox', { name: 'Password' });
const signInButton = page.getByRole('button', { name: 'Sign In' });
```

### 6.2 Lucatris Login Page
```typescript
// URL: https://lucatris.com/auth
const emailField = page.getByRole('textbox', { name: 'Email' });
const passwordField = page.getByRole('textbox', { name: 'Password' });
const signInButton = page.getByRole('button', { name: 'Sign in' });
```

### 6.3 QIMS Create User Page
```typescript
// URL: http://5.223.61.214:3000/dashboard/users/create
const fullNameCombo = page.getByRole('combobox', { name: 'Full Name' });
const searchInput = page.getByPlaceholder('Search inspector...');
const emailField = page.getByRole('textbox', { name: 'Email' });
const positionCombo = page.getByRole('combobox', { name: 'Position' });
const passwordField = page.getByRole('textbox', { name: 'Password', exact: true });
const confirmPasswordField = page.getByRole('textbox', { name: 'Confirm Password Confirm' });
const createButton = page.getByRole('button', { name: 'Create' });
```

---

## 7. Test Files Created

| File | Purpose |
|------|---------|
| `tests/test-new-users-101.spec.ts` | Login test for 101 new users on QIMS & Lucatris |
| `tests/qims-create-users-bulk.spec.ts` | Bulk user creation in QIMS |
| `tests/qims-create-user.spec.ts` | Original recorded test (single user) |
| `tests/lucatris-login-update-csv.spec.ts` | Lucatris login test with CSV update |
| `tests/qims-login-update-csv.spec.ts` | QIMS login test with CSV update |

---

## 8. Key Findings

### 8.1 Users Not in Inspector List (Cannot Create in QIMS)
These 10 users are not available in the inspector dropdown and need to be added to the inspector master list first:

1. MUHAMMAD NUCH (Jakarta)
2. I GUSTI NGURAH PUTU ARYA S (Cilegon)
3. AHMAD NAUFAL ALI (Cilegon)
4. DEDE NOFIYANTI - Coordinator Finance (Cilegon)
5. DINI PERMATASARI - Staff Accounting (Cilegon)
6. TRI DWI ARYANTI - Staff HR & Cashier (Cilegon)
7. VIRA INDRIYANA - SHE Officer (Cilegon)
8. AZIZA TANDRI - Staff Admin (Cilegon)
9. IKHWAN ABDUL JALAL - Warehouse & Asset (Cilegon)
10. YUDISTIRA BINTANG PUDIANSYAH (Duri)

### 8.2 Branch Summary
| Branch | Total New Users | QIMS Created | Lucatris Login |
|--------|-----------------|--------------|----------------|
| Jakarta | 32 | 31 | 22 |
| Cilegon | 68 | 59 | 8 |
| Balikpapan | 1 | 1 | 1 |
| Duri | 1 | 0 | 0 |

### 8.3 Email Domains
- `@radiant-utama.com` - Corporate email (most users)
- `@gmail.com` - Personal email (some Cilegon users)
- `@yahoo.com` - Personal email (1 user)

---

## 9. Recommendations

1. **Add Missing Users to Inspector List:** 10 users need to be added to the inspector master data before QIMS accounts can be created.

2. **Lucatris Registration:** Most new users (73) are not registered in Lucatris. Need separate process to create Lucatris accounts.

3. **Email Standardization:** Consider standardizing to corporate email (`@radiant-utama.com`) for all users.

4. **Cilegon Branch:** New branch with 68 users - most using personal gmail accounts.

---

## 10. How to Run Tests

### Run Login Test
```bash
npx playwright test test-new-users-101.spec.ts --headed --timeout=7200000
```

### Run User Creation Test
```bash
npx playwright test qims-create-users-bulk.spec.ts --headed --timeout=7200000
```

### View Test Report
```bash
npx playwright show-report
```

---

## 11. Appendix

### A. CSV Column Definitions
| Column | Description |
|--------|-------------|
| Name | Full name of the user |
| Email | Email address for login |
| Role | Job role/position in company |
| Branch | Office branch location |
| ERP | ERP system status (YES/empty) |
| QIMS Login | QIMS login test result (YES/empty) |
| Lucatris Login | Lucatris login test result (YES/empty) |
| Remark | Additional notes |

### B. Position Options in QIMS
- PM
- BOM
- Branch Operation Manager
- Inspector
- Admin
- Other

### C. Branch Locations
- Batam
- Jakarta
- Surabaya
- Duri
- Cirebon
- Palembang
- Balikpapan
- Cilegon (NEW)

---

*Document generated: 2026-01-28*
