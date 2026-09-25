import { supabase } from './lib/supabase';
import { scrapePage, ScrapeError } from './scraper';
import { evaluateRule } from './rule-engine';
import { sendDiscordNotification } from './notifications/discord';

export interface MonitorRow {
  id: string;
  name: string;
  url: string;
  interval_minutes: number;
  selector: string | null;
  last_checked_at: string | null;
  last_hash: string | null;
  is_active: boolean;
  rule_type: 'hash_diff' | 'text_contains' | 'text_not_contains' | 'price_threshold' | 'availability';
  rule_config: Record<string, any>;
  last_rule_matched: boolean | null;
}

function isScrapeError(err: unknown): err is ScrapeError {
  return typeof err === 'object' && err !== null && 'errorType' in err;
}

export async function checkMonitor(monitor: MonitorRow): Promise<void> {
  console.log(`Revisando "${monitor.name}" (${monitor.url})...`);

  let scrapeResult;
  try {
    scrapeResult = await scrapePage(monitor.url, {
  ...(monitor.selector ? { selector: monitor.selector } : {}),
  ruleType: monitor.rule_type,
  ruleConfig: monitor.rule_config,
});
  } catch (err) {
    if (isScrapeError(err) && err.errorType === 'SELECTOR_NOT_FOUND') {
      console.error(`  Selector roto: ${err.message}`);
      await pauseMonitorForBrokenSelector(monitor);
      return;
    }
    if (isScrapeError(err) && err.errorType === 'PRICE_EXTRACTION_FAILED') {
      console.error(`  Extracción de precio falló: ${err.message}`);
      // No pausamos automáticamente acá — a diferencia de un selector roto,
      // un fallo de extracción puntual puede ser un glitch temporal de la página.
      // Si se repite seguido, eso es tema de Fase 5 (resiliencia / reintentos).
      return;
    }

    const message = isScrapeError(err) ? err.message : (err as Error).message;
    console.error(`  Falló el scrape: ${message}`);
    return;
  }

  const evaluation = evaluateRule(
    monitor.rule_type,
    monitor.rule_config,
    scrapeResult,
    monitor
  );

  const { error: snapshotError } = await supabase.from('snapshots').insert({
    monitor_id: monitor.id,
    content_hash: scrapeResult.contentHash,
    text_excerpt: scrapeResult.textContent.slice(0, 500),
    status_code: scrapeResult.statusCode,
    extracted_value: scrapeResult.extractedValue,
    changed: evaluation.changed,
  });

  if (snapshotError) {
    console.error(`  Error guardando snapshot: ${snapshotError.message}`);
    return;
  }

  const { error: updateError } = await supabase
    .from('monitors')
    .update({
      last_checked_at: new Date().toISOString(),
      last_hash: scrapeResult.contentHash,
      last_rule_matched: evaluation.matched,
    })
    .eq('id', monitor.id);

  if (updateError) {
    console.error(`  Error actualizando monitor: ${updateError.message}`);
    return;
  }

  if (evaluation.changed) {
    console.log(`  🚨 ${evaluation.reason}`);

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await sendDiscordNotification(
          webhookUrl,
          `🚨 **${evaluation.reason}**\n**${monitor.name}**\n${monitor.url}`
        );
      } catch (err) {
        console.error(`  Error enviando notificación: ${(err as Error).message}`);
      }
    } else {
      console.log('  (DISCORD_WEBHOOK_URL no configurado, se omite la notificación)');
    }
  } else {
    console.log(`  ${evaluation.reason}`);
  }
}

async function pauseMonitorForBrokenSelector(monitor: MonitorRow): Promise<void> {
  const { error } = await supabase
    .from('monitors')
    .update({ is_active: false })
    .eq('id', monitor.id);

  if (error) {
    console.error(`  Error pausando monitor: ${error.message}`);
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await sendDiscordNotification(
      webhookUrl,
      `⚠️ **Monitor pausado automáticamente**\n**${monitor.name}**\nEl selector "${monitor.selector}" ya no se encontró en ${monitor.url}. Revísalo y reactiva el monitor cuando lo actualices.`
    );
  } catch (err) {
    console.error(`  Error enviando notificación: ${(err as Error).message}`);
  }
}

async function fetchMonitors(monitorId?: string): Promise<MonitorRow[]> {
  const baseQuery = supabase.from('monitors').select();

  const { data, error } = monitorId
    ? await baseQuery.eq('id', monitorId)
    : await baseQuery.eq('is_active', true);

  if (error) {
    throw new Error(`Error obteniendo monitores: ${error.message}`);
  }

  return (data ?? []) as MonitorRow[];
}

async function main() {
  const monitorId = process.argv[2];

  const monitors = await fetchMonitors(monitorId);

  if (monitors.length === 0) {
    console.log(monitorId ? 'No se encontró ese monitor.' : 'No hay monitores activos.');
    return;
  }

  for (const monitor of monitors) {
    await checkMonitor(monitor);
  }
}
if (require.main === module) {
  main();
}