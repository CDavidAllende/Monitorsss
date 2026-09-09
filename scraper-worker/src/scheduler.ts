import { supabase } from './lib/supabase';
import { checkMonitor, MonitorRow } from './check-monitor';

// Cada cuánto el scheduler se despierta a preguntar "¿algo venció ya?".
// No es la frecuencia del monitor en sí (esa es interval_minutes de cada
// uno) — es la granularidad con la que revisamos si ya toca.
const POLL_INTERVAL_MS = 60_000;

async function fetchDueMonitors(): Promise<MonitorRow[]> {
  const { data, error } = await supabase
    .from('monitors')
    .select()
    .eq('is_active', true);

  if (error) {
    throw new Error(`Error obteniendo monitores: ${error.message}`);
  }

  const now = Date.now();

  return (data as MonitorRow[]).filter((monitor) => {
    // Nunca se ha revisado -> está vencido desde ya.
    if (!monitor.last_checked_at) return true;

    const lastCheckedAt = new Date(monitor.last_checked_at).getTime();
    const dueAt = lastCheckedAt + monitor.interval_minutes * 60_000;

    return now >= dueAt;
  });
}

let isRunning = false;

async function tick(): Promise<void> {
  if (isRunning) {
    console.log('El ciclo anterior todavía sigue corriendo, me salto este.');
    return;
  }

  isRunning = true;
  try {
    const dueMonitors = await fetchDueMonitors();

    if (dueMonitors.length === 0) {
      console.log('Nada vencido todavía.');
      return;
    }

    console.log(`${dueMonitors.length} monitor(es) vencido(s), revisando...`);

    // Secuencial a propósito por ahora: simple y suficiente para el MVP.
    // Cuando esto se mueva a BullMQ (Fase 5), cada monitor se vuelve un
    // job independiente y sí pueden correr en paralelo de forma segura.
    for (const monitor of dueMonitors) {
      await checkMonitor(monitor);
    }
  } catch (err) {
    console.error('Error en el ciclo del scheduler:', (err as Error).message);
  } finally {
    isRunning = false;
  }
}

async function main() {
  console.log(
    `Scheduler iniciado. Revisando cada ${POLL_INTERVAL_MS / 1000}s cuáles monitores están vencidos. Ctrl+C para detener.`
  );

  await tick(); // corre una vez de inmediato al arrancar, no espera el primer intervalo
  setInterval(tick, POLL_INTERVAL_MS);
}

main();