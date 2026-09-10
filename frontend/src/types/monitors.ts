export interface Monitor {
  id: string;
  name: string;
  url: string;
  intervalMinutes: number;
  selector: string | null;
  lastCheckedAt: string | null;
  lastHash: string | null;
  createdAt: string;
}
 
export interface SnapshotHistoryEntry {
  id: string;
  monitor_id: string;
  checked_at: string;
  changed: boolean;
  text_excerpt: string | null;
  extracted_value: number | null;
}
 