import { UrlResponse } from "./types/interfaces";

// Invocación del portal
const { chromium } = require("playwright");
const fs = require("fs");
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
  //Iniciar navegador en background
  /*const browser = await chromium.launch();*/

  //Iniciar portal (navegador)
  const browser = await chromium.launch({ headless: false });

  const page = await browser.newPage();

  // Navegar a la cripta (URL de la página de inicio de sesión)
  await page.goto("https://pruebatecnica-sherpa-production.up.railway.app");

  try {
    //Ingreso de claves secretas para la cripta (inicio de sesion)
    const emailInput = await page.waitForSelector('input[id="email"]');
    const passInput = await page.waitForSelector('input[id="password"]');
    await emailInput.fill(process.env.SHERPA_USER);
    await passInput.fill(process.env.SHERPA_PASSWORD);

    //Iniciar sesion
    await Promise.all([
      page.waitForNavigation(),
      page.click('button.sherpa-button[type="submit"]'),
    ]);

    let codigo: string | undefined = "";

    //Buscar siglos sin desafio
    for (let siglo of siglosPDF) {
      //Filtrar siglo por siglo
      await page.selectOption("select", siglo);

      let bookTitleElement = await page.waitForSelector("h3.text-lg");
      let bookTitle = "";
      if (bookTitleElement !== null) {
        bookTitle = await bookTitleElement.textContent();
        console.log("Título del libro:", bookTitle);
      }
      //Desbloquear siguiente manuscrito si es necesario
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

      //Obteniendo manuscrito
      console.log(`Obteniendo manuscrito del siglo: ${siglo}`);
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        button.click(),
      ]);

      let path = await download.path();
      let buffer = await fs.readFileSync(path);
      //Extrayendo el contenido del PDF
      const contenido = buffer.toString("utf8");

      // Extraer código usando regex
      let match = contenido.match(/acceso:\s*([A-Z0-9]+)/i);
      if (match) {
        codigo = match[1];
        console.log(`Código extraído: ${codigo} \n\n`);
      } else {
        throw new Error("No se encontró el código en el PDF \n\n");
      }
    }

    // Buscar siglos con desafío
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

      if (buttonDoc !== null) {
        await buttonDoc.click();

        let preURL = await page.waitForSelector("pre.text-green-400");
        let url: string = await preURL.textContent();

        if (url !== "") {
          let urlCompleta = `${url}?bookTitle=${bookTitle.replace(
            " ",
            "%20"
          )}&unlockCode=${codigo}`;

          //Buscar información en la API
          console.log("Buscando información en las criptas de Sherpa...🔍");
          let data: UrlResponse = await axios
            .get(urlCompleta)
            .then((response) => response.data)
            .then((data: UrlResponse) => data)
            .catch(function (error) {
              throw new Error(error);
            });

          //Si se encontro una respuesta de la API intentar desencriptar el código
          if (data.success === false) {
            throw new Error(data.error);
          } else {
            if (data.challenge !== undefined) {
              let targets: number[] = data.challenge.targets;
              let vault: string[] = data.challenge.vault;

              console.log("Desencriptando el código...🔐");
              let characters: string[] = targets.map((index) =>
                binarySearchIndex(vault, index)
              );
              codigo = characters.join("");
            }
          }
          console.log(`Contraseña desencriptada: ${codigo}`);
        }
      }

      await closePopUp(page);
      //Desbloquear siguiente manuscrito si es necesario
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

      await closePopUp(page);

      let button = await page.waitForSelector("button:not([disabled])");

      console.log(`Obteniendo manuscrito del siglo: ${siglo}`);
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        button.click(),
      ]);

      //Extraer contenido del PDF
      let path = await download.path();
      let buffer = fs.readFileSync(path);
      const contenido = buffer.toString("utf8");

      // Extraer código usando regex
      if (contenido !== "") {
        codigo = extractCode(contenido);
        if (codigo !== undefined) {
          //Mostrar codigo si se encontro
          console.log(`Código extraído: ${codigo} \n\n`);
        } else if (contenido !== null) {
          //Mostrar contenido si no se encontro el codigo
          const matches = [...contenido.matchAll(/\(([^)]*)\)/g)]
            .map((m) => m[1].trim())
            .filter((linea) => linea !== "");

          const mensajeCompleto = matches.join("\n");

          console.log(`\n\n${mensajeCompleto}`);
        } else {
          //Error
          console.error("No se encontró el código en el PDF \n\n");
        }
      }
    }
  } catch (error) {
    console.error("Error al iniciar la aventura:", error.message);
  } finally {
    // Cerrar el navegador
    await page.close();
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

function extractCode(contenido: string) {
  let result = contenido.match(/acceso:\s*([A-Z0-9]+)/i);
  if (result) {
    return result[1];
  }
}

iniciarAventura();
