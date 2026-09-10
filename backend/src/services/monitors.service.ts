import { supabase } from '../lib/supabase';
import { Monitor, SnapshotHistoryEntry } from '../types/monitor';
import { CreateMonitorInput } from '../validation/monitor.schema';

// Forma cruda de la fila tal como vive en Postgres (snake_case)
interface MonitorRow {
  id: string;
  name: string;
  url: string;
  interval_minutes: number;
  selector: string | null;
  last_checked_at: string | null;
  last_hash: string | null;
  created_at: string;
}

function rowToMonitor(row: MonitorRow): Monitor {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    intervalMinutes: row.interval_minutes,
    selector: row.selector,
    lastCheckedAt: row.last_checked_at,
    lastHash: row.last_hash,
    createdAt: row.created_at,
  };
}

class MonitorsService {
  async create(input: CreateMonitorInput): Promise<Monitor> {
    const { data, error } = await supabase
      .from('monitors')
      .insert({
        name: input.name,
        url: input.url,
        interval_minutes: input.intervalMinutes,
        selector: input.selector ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creando monitor: ${error.message}`);
    }

    return rowToMonitor(data as MonitorRow);
  }

  async list(): Promise<Monitor[]> {
    const { data, error } = await supabase
      .from('monitors')
      .select()
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error listando monitores: ${error.message}`);
    }

    return (data as MonitorRow[]).map(rowToMonitor);
  }

  async getById(id: string): Promise<Monitor | null> {
    const { data, error } = await supabase
      .from('monitors')
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Error obteniendo monitor: ${error.message}`);
    }

    return data ? rowToMonitor(data as MonitorRow) : null;
  }

  async getHistory(
    monitorId: string,
    limit: number = 100
  ): Promise<SnapshotHistoryEntry[]> {
    const { data, error } = await supabase
      .from('snapshots')
      .select(
        'id, monitor_id, checked_at, changed, text_excerpt, extracted_value'
      )
      .eq('monitor_id', monitorId)
      .order('checked_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Error al obtener historial: ${error.message}`);
    }

    return (data ?? []) as SnapshotHistoryEntry[];
  }
}

export const monitorsService = new MonitorsService();