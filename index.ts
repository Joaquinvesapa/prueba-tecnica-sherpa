// Invocación del portal
const { chromium } = require("playwright");

async function iniciarAventura() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  console.log(process.env.SHERPA_USER);
  // Navegar a la cripta
  await page.goto("https://pruebatecnica-sherpa-production.up.railway.app");

  // Esperar a que cargue algún elemento específico
  const emailInput = await page.waitForSelector('input[id="email"]');
  const passInput = await page.waitForSelector('input[id="password"]');
  await emailInput.fill(process.env.SHERPA_USER);
  await passInput.fill(process.env.SHERPA_PASSWORD);

  // await page.waitForNavigation(5000);
  await page.click('button.sherpa-button[type="submit"]');

  // console.log("Aventura iniciada con éxito");
  // console.log(emailInput);
}

iniciarAventura();
