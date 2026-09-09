import { chromium, Browser } from 'playwright';
import crypto from 'crypto';

export interface ScrapeResult {
  url: string;
  html: string;
  textContent: string;
  contentHash: string;
  statusCode: number | null;
  timestamp: Date;
}

export interface ScrapeError {
  url: string;
  errorType: 'TIMEOUT' | 'NAVIGATION_FAILED' | 'SELECTOR_NOT_FOUND' | 'UNKNOWN';
  message: string;
  timestamp: Date;
}

interface ScrapeOptions {
  timeoutMs?: number;
  waitUntil?: 'domcontentloaded' | 'load' | 'networkidle';
  // Fase 2: si se da, solo se hashea/compara el texto de este elemento,
  // no la página completa.
  selector?: string;
}

function isScrapeError(err: unknown): err is ScrapeError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errorType' in err &&
    'url' in err
  );
}

/**
 * Visits a URL with a headless browser, captures the full HTML and the
 * visible text content, and computes a hash of the normalized text.
 *
 * Design decision: the hash is computed over normalized visible text
 * (body.innerText, whitespace-collapsed), NOT the raw HTML. Raw HTML
 * hashing produces constant false positives from CSRF tokens, session
 * IDs, ad slot IDs, and other content that changes every load without
 * anything "visible" actually changing. The raw HTML is still stored
 * so Fase 2 (selector-specific monitoring) can query into it later.
 *
 * This function does NOT retry on failure — that responsibility belongs
 * to the BullMQ job layer (Fase 5). Here we just fail fast with a
 * classified error so the caller can decide what to do.
 */
export async function scrapePage(
  url: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const { timeoutMs = 30_000, waitUntil = 'domcontentloaded', selector } = options;

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const response = await page.goto(url, {
      waitUntil,
      timeout: timeoutMs,
    });

    // Algunos sitios siguen navegando (redirects, trackers, anuncios)
    // después de domcontentloaded. Sin esta espera, page.content() puede
    // fallar con "page is navigating and changing the content".
    await page.waitForLoadState('load').catch(() => {
      // Si esto falla (timeout), seguimos igual: ya tenemos suficiente
      // contenido cargado como para extraerlo.
    });

    const html = await withRetryOnNavigation(() => page.content());

    let rawText: string;
    if (selector) {
      const element = await page.$(selector);
      if (!element) {
        throw {
          url,
          errorType: 'SELECTOR_NOT_FOUND',
          message: `No se encontró el selector "${selector}" en la página`,
          timestamp: new Date(),
        } satisfies ScrapeError;
      }
      rawText = await withRetryOnNavigation(() => element.innerText());
    } else {
      rawText = await withRetryOnNavigation(() =>
        page.evaluate(() => document.body.innerText)
      );
    }

    const textContent = normalizeText(rawText);

    const contentHash = hashContent(textContent);

    return {
      url,
      html,
      textContent,
      contentHash,
      statusCode: response ? response.status() : null,
      timestamp: new Date(),
    };
  } catch (err) {
    if (isScrapeError(err)) {
      throw err;
    }
    throw classifyError(url, err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Algunos sitios (anuncios, trackers, redirects) siguen navegando incluso
 * después de "load", lo que hace que page.content() o page.evaluate()
 * fallen intermitentemente con "page is navigating...". Reintentamos
 * un par de veces con una pequeña pausa antes de rendirnos.
 */
async function withRetryOnNavigation<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 500
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function classifyError(url: string, err: unknown): ScrapeError {
  const message = err instanceof Error ? err.message : String(err);

  let errorType: ScrapeError['errorType'] = 'UNKNOWN';
  if (/timeout/i.test(message)) {
    errorType = 'TIMEOUT';
  } else if (/net::|navigation/i.test(message)) {
    errorType = 'NAVIGATION_FAILED';
  }

  return {
    url,
    errorType,
    message,
    timestamp: new Date(),
  };
}