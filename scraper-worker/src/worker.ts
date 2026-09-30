// scraper-worker/src/worker.ts
import { Worker } from 'bullmq';
import { connection } from './lib/redis';
import { checkMonitor, MonitorRow } from './check-monitor';
import { supabase } from './lib/supabase';

async function fetchMonitorById(id: string): Promise<MonitorRow> {
  const { data, error } = await supabase.from('monitors').select().eq('id', id).single();
  if (error || !data) {
    throw new Error(`No se encontró el monitor ${id}: ${error?.message ?? 'sin datos'}`);
  }
  return data as MonitorRow;
}

const worker = new Worker(
  'check-monitor',
  async (job) => {
    console.log(`  [${new Date().toLocaleTimeString()}] [job ${job.id}] intento ${job.attemptsMade + 1}/${job.opts.attempts}`);
    const monitor = await fetchMonitorById(job.data.monitorId);
    if (!monitor.is_active) {
      console.log(`Monitor "${monitor.name}" está pausado, se omite el job.`);
      return;
    }
    await checkMonitor(monitor);
  },
  { connection, concurrency: 5 }
);

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} falló definitivamente tras sus reintentos: ${err.message}`);
});

console.log('Worker de checks iniciado, escuchando la cola "check-monitor"...');