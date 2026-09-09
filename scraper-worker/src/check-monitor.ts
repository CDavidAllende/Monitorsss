import { supabase } from './lib/supabase';
import { scrapePage, ScrapeError } from './scraper';
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
}

function isScrapeError(err: unknown): err is ScrapeError {
  return typeof err === 'object' && err !== null && 'errorType' in err;
}

/**
 * Revisa un monitor: scrapea su URL, compara el hash contra el último
 * guardado, inserta un snapshot y actualiza el monitor con el resultado.
 *
 * No reintenta en caso de fallo (eso lo maneja BullMQ en la Fase 5) —
 * aquí simplemente se registra el error y se sigue con el siguiente
 * monitor si se está revisando un lote.
 */
export async function checkMonitor(monitor: MonitorRow): Promise<void> {
  console.log(`Revisando "${monitor.name}" (${monitor.url})...`);

  let scrapeResult;
  try {
    scrapeResult = await scrapePage(
      monitor.url,
      monitor.selector ? { selector: monitor.selector } : {}
    );
  } catch (err) {
    if (isScrapeError(err) && err.errorType === 'SELECTOR_NOT_FOUND') {
      console.error(`  Selector roto: ${err.message}`);
      await pauseMonitorForBrokenSelector(monitor);
      return;
    }

    const message = isScrapeError(err) ? err.message : (err as Error).message;
    console.error(`  Falló el scrape: ${message}`);
    return;
  }

  // Si last_hash es null, es la primera vez que se revisa este monitor:
  // no hay nada contra qué comparar, así que no cuenta como "cambio".
  const changed =
    monitor.last_hash !== null && monitor.last_hash !== scrapeResult.contentHash;

  const { error: snapshotError } = await supabase.from('snapshots').insert({
    monitor_id: monitor.id,
    content_hash: scrapeResult.contentHash,
    text_excerpt: scrapeResult.textContent.slice(0, 500),
    status_code: scrapeResult.statusCode,
    changed,
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
    })
    .eq('id', monitor.id);

  if (updateError) {
    console.error(`  Error actualizando monitor: ${updateError.message}`);
    return;
  }

  if (changed) {
    console.log('  🚨 Cambio detectado');

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await sendDiscordNotification(
          webhookUrl,
          `🚨 **Cambio detectado**\n**${monitor.name}**\n${monitor.url}`
        );
      } catch (err) {
        // Un fallo de notificación no debe tumbar el chequeo: el snapshot
        // ya quedó guardado, eso es lo importante. Solo lo registramos.
        console.error(`  Error enviando notificación: ${(err as Error).message}`);
      }
    } else {
      console.log('  (DISCORD_WEBHOOK_URL no configurado, se omite la notificación)');
    }
  } else {
    console.log('  Sin cambios.');
  }
}

/**
 * Cuando el selector ya no matchea nada en la página (el sitio cambió su
 * HTML), no tiene sentido seguir intentando cada ciclo — eso solo generaría
 * ruido de error infinito. Pausamos el monitor y avisamos, para que el
 * usuario decida si actualiza el selector o lo borra.
 */
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
  // Uso:
  //   npx tsx src/check-monitor.ts              -> revisa todos los monitores activos
  //   npx tsx src/check-monitor.ts <monitor-id>  -> revisa uno en específico
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

// Solo corre el modo CLI si este archivo se ejecuta directamente
// (npx tsx src/check-monitor.ts). Si otro módulo lo importa (como
// scheduler.ts), este bloque no se dispara — evita que se ejecuten
// dos escaneos duplicados a la vez.
if (require.main === module) {
  main();
}