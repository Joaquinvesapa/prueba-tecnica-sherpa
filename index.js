// Invocación del portal
const { chromium } = require("playwright");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const axios = require("axios");

const siglosPDF = ["XIV", "XV", "XVI"];
const siglosDesafio = ["XVII", "XVIII"];

const closePopUp = async (page) => {
  let buttonClose = await page.waitForSelector(
    'button[aria-label="Cerrar modal"]',
    { timeout: 5000 }
  );

  await buttonClose.click();
};

async function iniciarAventura() {
  try {
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

    // console.log(await options[1].textContent()); //XIV
    // console.log(await options[2].textContent()); //XV
    // console.log(await options[3].textContent()); //XVI
    // console.log(await options[4].textContent()); //XVII
    // console.log(await options[5].textContent()); //XVIII

    let codigo = "";

    for (let siglo of siglosPDF) {
      await page.selectOption("select", siglo);

      if (codigo !== "") {
        let codeInput = await page.waitForSelector(
          'input[placeholder="Ingresá el código"]'
        );
        if (codeInput != null) {
          let buttonUnlock = await page.waitForSelector(
            "form button[type='submit']"
          );
          await codeInput.fill(codigo);
          await buttonUnlock.click();
        }
      }

      let button = await page.waitForSelector("button:not([disabled])");

      const [download] = await Promise.all([
        page.waitForEvent("download"),
        button.click(),
      ]);

      let path = await download.path();
      let buffer = await fs.readFileSync(path);
      const contenido = buffer.toString("utf8");

      // Extraer código usando regex
      let match = contenido.match(/acceso:\s*([A-Z0-9]+)/i);
      if (match) {
        codigo = match[1];
        console.log("Código extraído:", codigo);
      } else {
        console.error("No se encontró el código en el PDF");
      }
      console.log(
        `Siglo ${siglo} - Siguiente Acceso: ${
          match ? match[1] : "No encontrado"
        }`
      );
    }

    for (let siglo of siglosDesafio) {
      await page.selectOption("select", siglo);

      let bookTitleElement = await page.waitForSelector("h3.text-lg");
      let bookTitle = "";
      if (bookTitleElement !== null) {
        bookTitle = await bookTitleElement.textContent();
        console.log("Título del libro:", bookTitle);
      }
      let buttonDoc = await page.waitForSelector(
        "button:has-text('Ver documentación')"
      );
      let passWord;
      if (buttonDoc !== null) {
        await buttonDoc.click();

        let preURL = await page.waitForSelector("pre.text-green-400");
        let url = await preURL.textContent();
        if (url !== "") {
          let urlCompleta = `${url}?bookTitle=${bookTitle.replace(
            " ",
            "%20"
          )}&unlockCode=${codigo}`;
          console.log("URL completa:", urlCompleta);
          passWord = await axios
            .get(urlCompleta)
            .then((response) => response.data)
            .then((data) => {
              let characters = data.challenge.targets.map((index) =>
                binarySearchIndex(data.challenge.vault, index)
              );
              codigo = characters.join("");
              console.log("CODIGO DESENCRIPTADO:", codigo);
              return codigo;
            })
            .catch(function (error) {
              // manejar error
              console.log(error);
            });
        }
      }

      await closePopUp(page);

      if (codigo !== "") {
        console.log("Código para desbloquear:", passWord);
        let codeInput = await page.waitForSelector(
          'input[placeholder="Ingresá el código"]'
        );
        if (codeInput != null) {
          let buttonUnlock = await page.waitForSelector(
            "form button[type='submit']"
          );
          await codeInput.fill(codigo);
          await buttonUnlock.click();
        }
      }
      await closePopUp(page);

      let button = await page.waitForSelector("button:not([disabled])");

      const [download] = await Promise.all([
        page.waitForEvent("download"),
        button.click(),
      ]);

      let path = await download.path();
      let buffer = fs.readFileSync(path);
      console.log(buffer);
      // const contenido = buffer.toString("utf8");
      let contenido = await pdfParse(buffer)
        .then((data) => {
          data.text;
        })
        .catch((error) => {
          console.error("Error al procesar el PDF:", error);
        });

      console.log(`Siglo ${siglo} \n`, `${contenido} \n`);
      // Extraer código usando regex
      if (contenido !== "") {
        let match = contenido.match(/acceso:\s*([A-Z0-9]+)/i);
        if (match) {
          codigo = match[1];
          console.log("Código extraído:", codigo);
        } else {
          console.error("No se encontró el código en el PDF");
        }
        console.log(
          `Siglo ${siglo} - Siguiente Acceso: ${
            match ? match[1] : "No encontrado"
          }`
        );
      }
    }
  } catch (error) {
    console.error("Error al iniciar la aventura:", error.message);
  }
}

function binarySearchIndex(arr, targetIndex) {
  let low = 0;
  let high = arr.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (mid === targetIndex) {
      return arr[mid]; // encontramos el índice exacto
    } else if (mid < targetIndex) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return null; // si el índice es inválido
}

iniciarAventura();
