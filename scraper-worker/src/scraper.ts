import { chromium, Browser } from 'playwright';
import crypto from 'crypto';

export interface ScrapeResult {
  url: string;
  html: string;
  textContent: string;
  contentHash: string;
  extractedValue: number | null;
  statusCode: number | null;
  timestamp: Date;
}

export interface ScrapeError {
  url: string;
  errorType:
    | 'TIMEOUT'
    | 'NAVIGATION_FAILED'
    | 'SELECTOR_NOT_FOUND'
    | 'PRICE_EXTRACTION_FAILED'
    | 'UNKNOWN';  
  message: string;
  timestamp: Date;
}

interface ScrapeOptions {
  timeoutMs?: number;
  waitUntil?: 'domcontentloaded' | 'load' | 'networkidle';
  selector?: string;
  ruleType?: 'hash_diff' | 'text_contains' | 'text_not_contains' | 'price_threshold' | 'availability';
  ruleConfig?: {
    extraction_regex?: string;
    manual_value?: number;
    [key: string]: unknown;
  };
}

function isScrapeError(err: unknown): err is ScrapeError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errorType' in err &&
    'url' in err
  );
}

export async function scrapePage(
  url: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
 const {
  timeoutMs = 30_000,
  waitUntil = 'domcontentloaded',
  selector,
  ruleType,
} = options;

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const response = await page.goto(url, {
      waitUntil,
      timeout: timeoutMs,
    });
    await page.waitForLoadState('load').catch(() => {
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

let extractedValue: number | null = null;

if (ruleType === 'price_threshold') {
  extractedValue = extractNumericValue(textContent, options.ruleConfig?.extraction_regex);

  if (extractedValue === null && options.ruleConfig?.manual_value != null) {
    extractedValue = options.ruleConfig.manual_value;
  }

  if (extractedValue === null) {
    throw {
      url,
      errorType: 'PRICE_EXTRACTION_FAILED',
      message: `No se pudo extraer un valor numérico del texto: "${textContent}"`,
      timestamp: new Date(),
    } satisfies ScrapeError;
  }
}

const contentHash = hashContent(textContent);

    return {
  url,
  html,
  textContent,
  contentHash,
  extractedValue,
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

function extractNumericValue(text: string, customRegex?: string): number | null {
  const pattern = customRegex ? new RegExp(customRegex) : /\d[\d.,]*\d|\d/;
  const match = text.match(pattern);
  if (!match) return null;

  const normalized = match[0].replace(/,/g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
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