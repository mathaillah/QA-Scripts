# Task: Validate User Roles

## Objective
Validate that user roles in the Lucatris system match the expected roles from the user-list.md file.

## Test Steps

1. **Login to Lucatris**
   - URL: https://lucatris.com/auth
   - Email: tis.admin@radiant-utama.com
   - Password: rui123!

2. **Navigate to User Management**
   - URL: https://lucatris.com/admin/user-management

3. **Extract User Data from Website**
   - Get Name, Email, and Role for each user

4. **Compare with Expected Data**
   - Source: `data/user-list.md`
   - Match by email address
   - Compare roles

## Role Mapping

| Abbreviation | Full Name |
|--------------|-----------|
| PM | Project Manager |
| RM | Resource Manager |
| WH | Warehouse |
| IT | IT |
| Inspector | Inspector |

## Expected Output

- List of users with matching roles (PASS)
- List of users with mismatched roles (FAIL)
- List of users not found in system
- List of users in system but not in expected list

## Test File
- Location: `tests/validate-role-lucatris.spec.ts`

## Results File
- Location: `test-results/validate-role-results-{timestamp}.md`
