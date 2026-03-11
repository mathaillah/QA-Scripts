import { test, expect } from '@playwright/test';

interface FailedUser {
  name: string;
  email: string;
  branch: string;
}

test('Retest Lucatris Failed Users', async ({ page, context }) => {
  test.setTimeout(600000); // 10 minutes

  // Failed Lucatris users from results
  const failedUsers: FailedUser[] = [
    { name: 'BOBY SAFRA MADONA', email: 'boby.madona@radiant-utama.com', branch: 'Batam' },
    { name: 'ERIZAL', email: 'erizal@radiant-utama.com', branch: 'Batam' },
    { name: 'MASHUDI', email: 'mashudi@radiant-utama.com', branch: 'Batam' },
    { name: 'RIZKY BAHTIAR SIDIQ', email: 'rizky.sidiq@radiant-utama.com', branch: 'Jakarta' },
    { name: 'ANDIKA BAGAS RISMAWAN', email: 'andika.rismawan@radiant-utama.com', branch: 'Jakarta' },
    { name: 'ARIEF HANDITIO', email: 'arief.handitio@radiant-utama.com', branch: 'Palembang' },
    { name: 'AGUNG NUGROHO', email: 'agung@radiant-utama.com', branch: 'Jakarta' },
    { name: 'AKHIR PURWANTO', email: 'akhir.purwanto@radiant-utama.com', branch: 'Jakarta' },
    { name: 'MUHAMMAD IQBALSYAH', email: 'iqbalsyah@radiant-utama.com', branch: 'Jakarta' },
    { name: 'MUHAMMAD NUCH', email: 'Muhammad.nuch1975@gmail.com', branch: 'Jakarta' },
    { name: 'RAHMAT YULI HARNANTO', email: 'rahmat.yuliharnanto@radiant-utama.com', branch: 'Jakarta' },
    { name: 'PRASTOWO', email: 'prastowo.armiwanto@radiant-utama.com', branch: 'Cilegon' },
    { name: 'ACHMAD SAYUTI', email: 'achmadsayuti1276@gmail.com', branch: 'Cilegon' },
    { name: 'ACHMAD SUCIPTO', email: 'achmadsucipto37@gmail.com', branch: 'Cilegon' },
    { name: 'SANURI', email: 'sanurisg@gmail.com', branch: 'Cilegon' },
    { name: 'BADRUDIN', email: 'badrudin.ndt85@gmail.com', branch: 'Cilegon' },
    { name: 'IFAN SUNANDA', email: 'ifansnda77@gmail.com', branch: 'Cilegon' },
    { name: 'YATNA HERIYANTO', email: 'Yatnaheri84@gmail.com', branch: 'Cilegon' },
    { name: 'SUHER', email: 'suherlangon@yahoo.com', branch: 'Cilegon' },
    { name: 'HIDAYATULLOH', email: 'hidayattullloh162@gmail.com', branch: 'Cilegon' },
    { name: 'SUEDI', email: 'ediy.lfc@gmail.com', branch: 'Cilegon' },
    { name: 'HARI BAGUS RAHMAN', email: 'bagusyah78@gmail.com', branch: 'Cilegon' },
    { name: 'AHMAD SAREAT', email: 'sareatahmad@gmail.com', branch: 'Cilegon' },
    { name: 'ALI SIHABUDIN', email: 'alisihabudin3@gmail.com', branch: 'Cilegon' },
    { name: 'ENDANG SUPRIATNA', email: 'endangsupriatna699@gmail.com', branch: 'Cilegon' },
    { name: 'ALPRILIANCY RUMAE', email: 'rumaealpriliancy@gmail.com', branch: 'Cilegon' },
    { name: 'WAWAN KURNIAWAN', email: 'Wawankurniawan.ntx@gmail.com', branch: 'Cilegon' },
    { name: 'LEGA AFRIZA', email: 'legaafriza@gmail.com', branch: 'Cilegon' },
    { name: 'AHMAD NAUFAL ALI', email: 'ahmadnaufalalii@gmail.com', branch: 'Cilegon' },
    { name: 'R. JAKA MARENDRA', email: 'jakamarendra33@gmail.com', branch: 'Cilegon' },
    { name: 'DANI ARDIANSYAH', email: 'dniardiansyh@gmail.com', branch: 'Cilegon' },
    { name: 'NAUFAL CAHYA FIRDAUS', email: 'naufalareksby@gmail.com', branch: 'Cilegon' },
    { name: 'SIGIT SETIYAWAN', email: 'sigitstwn805@gmail.com', branch: 'Cilegon' },
    { name: 'ADITYA RAMADHAN', email: 'aditya121ramadhan@gmail.com', branch: 'Cilegon' },
    { name: 'YUDHA ADIA TRISMA', email: 'yudhaadiatrisma35@gmail.com', branch: 'Cilegon' },
    { name: 'MAHESA RIZQI HARY NATADIRAKSA', email: 'mahesahary@gmail.com', branch: 'Cilegon' },
    { name: 'DEDE NOFIYANTI', email: 'dede.nofiyanti@radiant-utama.com', branch: 'Cilegon' },
    { name: 'DINI PERMATASARI', email: 'dini.permatasari@radiant-utama.com', branch: 'Cilegon' },
    { name: 'NAMIRA AWALIYATUN NISA', email: 'namira.nisa@radiant-utama.com', branch: 'Cilegon' },
    { name: 'TRI DWI ARYANTI', email: 'tri.aryanti@radiant-utama.com', branch: 'Cilegon' },
    { name: 'ASQAR ALBAR FARIZI', email: 'asqar.albar@radiant-utama.com', branch: 'Cilegon' },
    { name: 'VIRA INDRIYANA', email: 'vira.indriyana@radiant-utama.com', branch: 'Cilegon' },
    { name: 'AZIZA TANDRI', email: 'aziza.tandri@radiant-utama.com', branch: 'Cilegon' },
    { name: 'IKHWAN ABDUL JALAL', email: 'ikhwan.abdul@radiant-utama.com', branch: 'Cilegon' },
    { name: 'YUDISTIRA BINTANG PUDIANSYAH', email: 'yudistira.bintang@radiant-utama.com', branch: 'Duri' },
  ];

  const password = 'rui123';
  const results: { name: string; email: string; branch: string; status: string }[] = [];

  console.log(`\n========================================`);
  console.log(`RETEST LUCATRIS FAILED USERS`);
  console.log(`========================================`);
  console.log(`Total users to retest: ${failedUsers.length}`);
  console.log(`========================================\n`);

  for (let i = 0; i < failedUsers.length; i++) {
    const user = failedUsers[i];
    process.stdout.write(`[${i + 1}/${failedUsers.length}] ${user.name.substring(0, 25).padEnd(25)} `);

    try {
      await context.clearCookies();
      await page.goto('https://lucatris.com/auth', { timeout: 30000, waitUntil: 'domcontentloaded' });

      try {
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
      } catch {}

      await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
      await page.getByRole('textbox', { name: 'Password' }).fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();

      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      if (!currentUrl.includes('/auth')) {
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

  // Still failed
  const stillFailed = results.filter(r => r.status !== 'YES');
  if (stillFailed.length > 0) {
    console.log(`\n## Still Failed (${stillFailed.length})\n`);
    console.log(`| No | Name | Email | Branch |`);
    console.log(`|----|------|-------|--------|`);
    stillFailed.forEach((r, idx) => {
      console.log(`| ${idx + 1} | ${r.name} | ${r.email} | ${r.branch} |`);
    });
  }

  expect(results.length).toBe(failedUsers.length);
});
