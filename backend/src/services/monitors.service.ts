import { supabase } from '../lib/supabase';
import { Monitor, SnapshotHistoryEntry } from '../types/monitor';
import { CreateMonitorInput, UpdateMonitorInput } from '../validation/monitor.schema';

interface MonitorRow {
  id: string;
  name: string;
  url: string;
  interval_minutes: number;
  selector: string | null;
  last_checked_at: string | null;
  last_hash: string | null;
  created_at: string;
  is_active: boolean;
  rule_type: Monitor['ruleType'];
  rule_config: Record<string, any>;
  last_rule_matched: boolean | null;
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
    isActive: row.is_active,
    ruleType: row.rule_type,
    ruleConfig: row.rule_config,
    lastRuleMatched: row.last_rule_matched,
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
        rule_type: input.ruleType,
        rule_config: input.ruleConfig,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creando monitor: ${error.message}`);
    }

    return rowToMonitor(data as MonitorRow);
  }

  async update(id: string, input: UpdateMonitorInput): Promise<Monitor | null> {
    const patch: Record<string, any> = {};

    if (input.name !== undefined) patch.name = input.name;
    if (input.url !== undefined) patch.url = input.url;
    if (input.intervalMinutes !== undefined) patch.interval_minutes = input.intervalMinutes;
    if (input.selector !== undefined) patch.selector = input.selector;
    if (input.isActive !== undefined) patch.is_active = input.isActive;
    if (input.ruleType !== undefined) {
      patch.rule_type = input.ruleType;
      patch.rule_config = input.ruleConfig ?? {};
      // Cambiar de tipo de regla invalida el estado de "matched" anterior —
      // no tiene sentido comparar la transición contra una regla distinta.
      patch.last_rule_matched = null;
    }

    if (Object.keys(patch).length === 0) {
      return this.getById(id);
    }

    const { data, error } = await supabase
      .from('monitors')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Error actualizando monitor: ${error.message}`);
    }

    return data ? rowToMonitor(data as MonitorRow) : null;
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