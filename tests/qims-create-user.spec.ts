import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://5.223.61.214:3000/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('aan.pujihidayat@radiant-utama.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('rui123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('link', { name: 'User Management' }).click();
  await page.getByRole('link', { name: 'Create User' }).click();
  await page.getByRole('combobox', { name: 'Full Name' }).click();
  await page.getByPlaceholder('Search inspector...').fill('aditya');
  await page.getByRole('option', { name: 'ADITYA WIDYANTARA' }).click();
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('aditya.widyantara@radiant-utama.com');
  await page.getByRole('combobox', { name: 'Position' }).click();
  await page.getByRole('option', { name: 'Inspector' }).click();
  await page.getByRole('textbox', { name: 'Password', exact: true }).click();
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('rui123');
  await page.getByRole('textbox', { name: 'Confirm Password Confirm' }).click();
  await page.getByRole('textbox', { name: 'Confirm Password Confirm' }).fill('rui123');
  await page.getByRole('button', { name: 'Create' }).click();
});