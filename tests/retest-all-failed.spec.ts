import { test, expect } from '@playwright/test';

interface FailedUser {
  name: string;
  email: string;
  branch: string;
}

test('Retest all failed users on QIMS and Lucatris', async ({ page, context }) => {
  test.setTimeout(600000); // 10 minutes

  // All failed users (union of QIMS and Lucatris failed)
  const failedUsers: FailedUser[] = [
    { name: 'BOBY SAFRA MADONA', email: 'boby.madona@radiant-utama.com', branch: 'Batam' },
    { name: 'ERIZAL', email: 'erizal@radiant-utama.com', branch: 'Batam' },
    { name: 'MASHUDI', email: 'mashudi@radiant-utama.com', branch: 'Batam' },
    { name: 'RIZKY BAHTIAR SIDIQ', email: 'rizky.sidiq@radiant-utama.com', branch: 'Jakarta' },
    { name: 'ANDIKA BAGAS RISMAWAN', email: 'andika.rismawan@radiant-utama.com', branch: 'Jakarta' },
    { name: 'ARIEF HANDITIO', email: 'arief.handitio@radiant-utama.com', branch: 'Palembang' },
    { name: 'MUHAMMAD NUCH', email: 'muhammad.nuch1975@gmail.com', branch: 'Jakarta' },
    { name: 'PRASTOWO', email: 'prastowo.armiwanto@radiant-utama.com', branch: 'Cilegon' },
    { name: 'ACHMAD SAYUTI', email: 'achmadsayuti1276@gmail.com', branch: 'Cilegon' },
    { name: 'ACHMAD SUCIPTO', email: 'achmadsucipto37@gmail.com', branch: 'Cilegon' },
    { name: 'SANURI', email: 'sanurisg@gmail.com', branch: 'Cilegon' },
    { name: 'BADRUDIN', email: 'badrudin.ndt85@gmail.com', branch: 'Cilegon' },
    { name: 'IFAN SUNANDA', email: 'ifansnda77@gmail.com', branch: 'Cilegon' },
    { name: 'YATNA HERIYANTO', email: 'yatnaheri84@gmail.com', branch: 'Cilegon' },
    { name: 'SUHER', email: 'suherlangon@yahoo.com', branch: 'Cilegon' },
    { name: 'HIDAYATULLOH', email: 'hidayattullloh162@gmail.com', branch: 'Cilegon' },
    { name: 'SUEDI', email: 'ediy.lfc@gmail.com', branch: 'Cilegon' },
    { name: 'HARI BAGUS RAHMAN', email: 'bagusyah78@gmail.com', branch: 'Cilegon' },
    { name: 'AHMAD SAREAT', email: 'sareatahmad@gmail.com', branch: 'Cilegon' },
    { name: 'ALI SIHABUDIN', email: 'alisihabudin3@gmail.com', branch: 'Cilegon' },
    { name: 'ENDANG SUPRIATNA', email: 'endangsupriatna699@gmail.com', branch: 'Cilegon' },
    { name: 'ALPRILIANCY RUMAE', email: 'rumaealpriliancy@gmail.com', branch: 'Cilegon' },
    { name: 'WAWAN KURNIAWAN', email: 'wawankurniawan.ntx@gmail.com', branch: 'Cilegon' },
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
  const results: { name: string; email: string; branch: string; qims: string; lucatris: string }[] = [];

  console.log(`\n========================================`);
  console.log(`RETEST ALL FAILED USERS`);
  console.log(`========================================`);
  console.log(`Total users: ${failedUsers.length}`);
  console.log(`========================================\n`);

  // Test QIMS
  console.log(`\n========== QIMS TEST ==========\n`);
  const qimsResults: Map<string, string> = new Map();

  for (let i = 0; i < failedUsers.length; i++) {
    const user = failedUsers[i];
    process.stdout.write(`[QIMS ${i + 1}/${failedUsers.length}] ${user.name.substring(0, 25).padEnd(25)} `);

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
        qimsResults.set(user.email, 'YES');
      } else {
        console.log(`✗ NO`);
        qimsResults.set(user.email, 'NO');
      }
    } catch (error) {
      console.log(`✗ ERROR`);
      qimsResults.set(user.email, 'NO');
    }
  }

  // Test Lucatris
  console.log(`\n========== LUCATRIS TEST ==========\n`);
  const lucatrisResults: Map<string, string> = new Map();

  for (let i = 0; i < failedUsers.length; i++) {
    const user = failedUsers[i];
    process.stdout.write(`[Lucatris ${i + 1}/${failedUsers.length}] ${user.name.substring(0, 25).padEnd(25)} `);

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
        lucatrisResults.set(user.email, 'YES');
      } else {
        console.log(`✗ NO`);
        lucatrisResults.set(user.email, 'NO');
      }
    } catch (error) {
      console.log(`✗ ERROR`);
      lucatrisResults.set(user.email, 'NO');
    }
  }

  // Compile results
  for (const user of failedUsers) {
    results.push({
      ...user,
      qims: qimsResults.get(user.email) || 'NO',
      lucatris: lucatrisResults.get(user.email) || 'NO',
    });
  }

  // Summary
  const qimsSuccess = results.filter(r => r.qims === 'YES').length;
  const lucatrisSuccess = results.filter(r => r.lucatris === 'YES').length;

  console.log(`\n========================================`);
  console.log(`RETEST COMPLETE`);
  console.log(`========================================`);
  console.log(`QIMS: ${qimsSuccess} success, ${results.length - qimsSuccess} failed`);
  console.log(`Lucatris: ${lucatrisSuccess} success, ${results.length - lucatrisSuccess} failed`);
  console.log(`========================================\n`);

  // Now successful on QIMS
  const nowQimsSuccess = results.filter(r => r.qims === 'YES');
  if (nowQimsSuccess.length > 0) {
    console.log(`\n## Now Successful on QIMS (${nowQimsSuccess.length})\n`);
    console.log(`| No | Name | Email | Branch |`);
    console.log(`|----|------|-------|--------|`);
    nowQimsSuccess.forEach((r, idx) => {
      console.log(`| ${idx + 1} | ${r.name} | ${r.email} | ${r.branch} |`);
    });
  }

  // Now successful on Lucatris
  const nowLucatrisSuccess = results.filter(r => r.lucatris === 'YES');
  if (nowLucatrisSuccess.length > 0) {
    console.log(`\n## Now Successful on Lucatris (${nowLucatrisSuccess.length})\n`);
    console.log(`| No | Name | Email | Branch |`);
    console.log(`|----|------|-------|--------|`);
    nowLucatrisSuccess.forEach((r, idx) => {
      console.log(`| ${idx + 1} | ${r.name} | ${r.email} | ${r.branch} |`);
    });
  }

  // Full results
  console.log(`\n## Full Results\n`);
  console.log(`| No | Name | Email | QIMS | Lucatris |`);
  console.log(`|----|------|-------|------|----------|`);
  results.forEach((r, idx) => {
    const qIcon = r.qims === 'YES' ? '✓' : '✗';
    const lIcon = r.lucatris === 'YES' ? '✓' : '✗';
    console.log(`| ${idx + 1} | ${r.name} | ${r.email} | ${qIcon} | ${lIcon} |`);
  });

  expect(results.length).toBe(failedUsers.length);
});
