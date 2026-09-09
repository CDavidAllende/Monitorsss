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