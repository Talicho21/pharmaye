const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/inventory/search')) {
      console.log('SEARCH STATUS', response.status());
      console.log('SEARCH URL', url);
      console.log('SEARCH HEADERS', JSON.stringify(Object.fromEntries(response.headers())));
      try {
        const body = await response.text();
        console.log('SEARCH BODY', body.slice(0, 700));
      } catch (error) {
        console.log('SEARCH BODY ERROR', error?.message || error);
      }
    }
  });

  await page.goto('http://localhost:3001/login');
  await page.fill('input[placeholder="Enter username"]', 'eseruadmin');
  await page.fill('input[placeholder="Enter password"]', 'Zk7@aw%Xm!');
  await page.click('button:has-text("Sign in")');
  await page.waitForTimeout(3000);
  console.log('AFTER LOGIN URL', page.url());
  console.log('SESSION STORAGE', await page.evaluate(() => localStorage.getItem('pharmacy_auth_session_v1')));

  await page.goto('http://localhost:3001/sell-out');
  await page.waitForTimeout(4000);
  console.log('SELL OUT URL', page.url());
  console.log('BODY BEFORE TYPING', (await page.locator('body').innerText()).slice(0, 900));

  await page.fill('input[placeholder="Search by medicine name or batch number"]', 'DEXROSE');
  await page.waitForTimeout(1500);
  console.log('BODY AFTER TYPING', (await page.locator('body').innerText()).slice(0, 1600));

  await browser.close();
})();
