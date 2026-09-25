import Link from 'next/link';
import { getMonitors } from '@/lib/api';

export default async function HomePage() {
  const monitors = await getMonitors();

  return (
    <main className="max-w-3xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Monitores</h1>
        <Link
          href="/monitors/new"
          className="bg-blue-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-blue-700"
        >
          + Nuevo monitor
        </Link>
      </div>      
      {monitors.length === 0 ? (
        <p className="text-gray-500">No hay monitores creados todavía.</p>
      ) : (
        <ul className="space-y-3">
          {monitors.map((monitor) => (
            <li key={monitor.id}>
              <Link
                href={`/monitors/${monitor.id}`}
                className="block border rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <div className="font-semibold">{monitor.name}</div>
                <div className="text-sm text-gray-500 truncate">
                  {monitor.url}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Cada {monitor.intervalMinutes} min
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}