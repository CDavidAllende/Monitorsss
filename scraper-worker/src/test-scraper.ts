// Uso manual, sin BullMQ ni DB todavia:
//   npx ts-node test-scraper.ts https://ejemplo.com
//
// Sirve para confirmar que el worker levanta el navegador, extrae
// contenido y calcula el hash antes de conectarlo a nada mas.

import { scrapePage } from './scraper';

async function main() {
  const url = process.argv[2];

  if (!url) {
    console.error('Uso: npx ts-node test-scraper.ts <url>');
    process.exit(1);
  }

  console.log(`Escaneando ${url}...`);

  try {
    const result = await scrapePage(url);

    console.log('--- Resultado ---');
    console.log('Status:', result.statusCode);
    console.log('Hash:', result.contentHash);
    console.log('Texto (primeros 200 chars):', result.textContent.slice(0, 200));
    console.log('HTML length:', result.html.length, 'chars');
  } catch (err) {
    console.error('Fallo el scrape:', err);
    process.exit(1);
  }
}

main();
