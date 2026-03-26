import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`PAGE LOG: ${msg.text()}`);
  });

  await page.goto('http://localhost:5176/signup');

  // Fill out the signup form
  await page.fill('input#fullName', 'Test User');
  await page.fill('input#email', `testuser${Date.now()}@example.com`);
  await page.fill('input#password', 'password123');
  await page.fill('input#confirmPassword', 'password123');

  // Click Submit
  await page.click('button[type="submit"]');

  // Wait a few seconds to let events fire
  await page.waitForTimeout(5000);

  await browser.close();
})();
