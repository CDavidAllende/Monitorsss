import { Monitor, SnapshotHistoryEntry } from '@/types/monitors';
 
const API_URL = process.env.NEXT_PUBLIC_API_URL;
 
export async function getMonitors(): Promise<Monitor[]> {
  const res = await fetch(`${API_URL}/monitors`, { cache: 'no-store' });
 
  if (!res.ok) {
    throw new Error('Error al obtener monitores');
  }
 
  return res.json();
}
 
export async function getMonitorHistory(
  monitorId: string
): Promise<SnapshotHistoryEntry[]> {
  const res = await fetch(`${API_URL}/monitors/${monitorId}/history`, {
    cache: 'no-store',
  });
 
  if (!res.ok) {
    throw new Error('Error al obtener historial');
  }
 
  return res.json();
}
 