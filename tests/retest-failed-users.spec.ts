import { test, expect } from '@playwright/test';

interface FailedUser {
  name: string;
  email: string;
  branch: string;
  note?: string;
}

test('Retest QIMS Failed Users with updated emails', async ({ page, context }) => {
  test.setTimeout(600000); // 10 minutes

  // Updated failed users from the results file
  const failedUsers: FailedUser[] = [
    { name: 'BOBY SAFRA MADONA', email: 'boby.madona@radiant-utama.com', branch: 'Batam' },
    { name: 'ERIZAL', email: 'erizal@radiant-utama.com', branch: 'Batam' },
    { name: 'MASHUDI', email: 'mashudi@radiant-utama.com', branch: 'Batam' },
    { name: 'RIZKY BAHTIAR SIDIQ', email: 'rizky.sidiq@radiant-utama.com', branch: 'Jakarta' },
    { name: 'ANDIKA BAGAS RISMAWAN', email: 'andika.rismawan@radiant-utama.com', branch: 'Jakarta' },
    { name: 'ARIEF HANDITIO', email: 'arief.handitio@radiant-utama.com', branch: 'Palembang' },
    { name: 'AGUNG NUGROHO', email: 'agung@radiant-utama.com', branch: 'Jakarta', note: 'email berbeda' },
    { name: 'AKHIR PURWANTO', email: 'akhir.purwanto@radiant-utama.com', branch: 'Jakarta' },
    { name: 'MUHAMMAD IQBALSYAH', email: 'iqbalsyah@radiant-utama.com', branch: 'Jakarta' },
    { name: 'MUHAMMAD NUCH', email: 'mmuhammad.nuch@radiant-utama.com', branch: 'Jakarta' },
    { name: 'RAHMAT YULI HARNANTO', email: 'rahmat.yuliharnanto@radiant-utama.com', branch: 'Jakarta' },
    { name: 'PRASTOWO', email: 'prastowo.armiwanto@radiant-utama.com', branch: 'Cilegon', note: 'beda email' },
    { name: 'SANURI', email: 'sanurisg@gmail.com', branch: 'Cilegon' },
    { name: 'BADRUDIN', email: 'badrudin.ndt85@gmail.com', branch: 'Cilegon' },
    { name: 'SUEDI', email: 'ediy.lfc@gmail.com', branch: 'Cilegon' },
    { name: 'AHMAD NAUFAL ALI', email: 'ahmadnaufalalii@gmail.com', branch: 'Cilegon', note: 'tidak ada data' },
    { name: 'NAUFAL CAHYA FIRDAUS', email: 'naufalareksby@gmail.com', branch: 'Cilegon' },
    { name: 'DEDE NOFIYANTI', email: 'dede.nofiyanti@radiant-utama.com', branch: 'Cilegon', note: 'Tidak ada data' },
    { name: 'DINI PERMATASARI', email: 'dini.permatasari@radiant-utama.com', branch: 'Cilegon', note: 'Tidak ada data' },
    { name: 'VIRA INDRIYANA', email: 'vira.indriyana@radiant-utama.com', branch: 'Cilegon' },
    { name: 'AZIZA TANDRI', email: 'aziza.tandri@radiant-utama.com', branch: 'Cilegon' },
    { name: 'IKHWAN ABDUL JALAL', email: 'ikhwan.abdul@radiant-utama.com', branch: 'Cilegon' },
    { name: 'YUDISTIRA BINTANG PUDIANSYAH', email: 'yudistira.bintang@radiant-utama.com', branch: 'Duri' },
  ];

  const password = 'rui123';
  const results: { name: string; email: string; branch: string; status: string; note?: string }[] = [];

  console.log(`\n========================================`);
  console.log(`RETEST QIMS FAILED USERS`);
  console.log(`========================================`);
  console.log(`Total users to retest: ${failedUsers.length}`);
  console.log(`========================================\n`);

  for (let i = 0; i < failedUsers.length; i++) {
    const user = failedUsers[i];
    process.stdout.write(`[${i + 1}/${failedUsers.length}] ${user.name.substring(0, 25).padEnd(25)} `);

    try {
      await context.clearCookies();
      await page.goto('http://5.223.61.214:3000/sign-in', { timeout: 30000, waitUntil: 'domcontentloaded' });

      await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign In' }).click();

      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      if (!currentUrl.includes('sign-in')) {
        console.log(`✓ YES`);
        results.push({ ...user, status: 'YES' });
      } else {
        console.log(`✗ NO`);
        results.push({ ...user, status: 'NO' });
      }
    } catch (error) {
      console.log(`✗ ERROR`);
      results.push({ ...user, status: 'ERROR' });
    }
  }

  // Summary
  const success = results.filter(r => r.status === 'YES').length;
  const failed = results.filter(r => r.status !== 'YES').length;

  console.log(`\n========================================`);
  console.log(`RETEST COMPLETE`);
  console.log(`========================================`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
  console.log(`========================================\n`);

  // Print results table
  console.log(`\n## Results\n`);
  console.log(`| No | Name | Email | Status |`);
  console.log(`|----|------|-------|--------|`);
  results.forEach((r, idx) => {
    const statusIcon = r.status === 'YES' ? '✓' : '✗';
    console.log(`| ${idx + 1} | ${r.name} | ${r.email} | ${statusIcon} ${r.status} |`);
  });

  // Still failed
  const stillFailed = results.filter(r => r.status !== 'YES');
  if (stillFailed.length > 0) {
    console.log(`\n## Still Failed (${stillFailed.length})\n`);
    console.log(`| No | Name | Email | Branch | Note |`);
    console.log(`|----|------|-------|--------|------|`);
    stillFailed.forEach((r, idx) => {
      console.log(`| ${idx + 1} | ${r.name} | ${r.email} | ${r.branch} | ${r.note || ''} |`);
    });
  }

  // Now successful
  const nowSuccess = results.filter(r => r.status === 'YES');
  if (nowSuccess.length > 0) {
    console.log(`\n## Now Successful (${nowSuccess.length})\n`);
    console.log(`| No | Name | Email | Branch |`);
    console.log(`|----|------|-------|--------|`);
    nowSuccess.forEach((r, idx) => {
      console.log(`| ${idx + 1} | ${r.name} | ${r.email} | ${r.branch} |`);
    });
  }

  expect(results.length).toBe(failedUsers.length);
});
