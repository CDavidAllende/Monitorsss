export interface Monitor {
  id: string;
  name: string;
  url: string;
  intervalMinutes: number;
  selector: string | null;
  lastCheckedAt: string | null;
  lastHash: string | null;
  createdAt: string;
  isActive: boolean;
  ruleType: 'hash_diff' | 'text_contains' | 'text_not_contains' | 'price_threshold' | 'availability';
  ruleConfig: Record<string, any>;
  lastRuleMatched: boolean | null;
}

export interface SnapshotHistoryEntry {
  id: string;
  monitor_id: string;
  checked_at: string;
  changed: boolean;
  text_excerpt: string | null;
  extracted_value: number | null;
}