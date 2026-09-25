export type RuleType =
  | 'hash_diff'
  | 'text_contains'
  | 'text_not_contains'
  | 'price_threshold'
  | 'availability';

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
  ruleType: RuleType;
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

// Payload que manda el form al crear un monitor
export type CreateMonitorPayload = {
  name: string;
  url: string;
  intervalMinutes: number;
  selector?: string;
} & (
  | { ruleType: 'hash_diff'; ruleConfig?: Record<string, never> }
  | { ruleType: 'text_contains' | 'text_not_contains'; ruleConfig: { text: string } }
  | {
      ruleType: 'price_threshold';
      ruleConfig: {
        operator: 'lt' | 'lte' | 'gt' | 'gte';
        value: number;
        extraction_regex?: string;
        manual_value?: number;
      };
    }
  | {
      ruleType: 'availability';
      ruleConfig: { expect: 'in_stock' | 'out_of_stock'; map: Record<string, string[]> };
    }
);