import { getMonitorHistory } from '@/lib/api';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function MonitorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const history = await getMonitorHistory(id);

  return (
    <main className="max-w-3xl mx-auto p-8">
      <a href="/" className="text-sm text-blue-600 hover:underline">
        ← Volver a monitores
      </a>

      <h1 className="text-2xl font-bold mt-2 mb-6">Historial</h1>

      {history.length === 0 ? (
        <p className="text-gray-500">
          Todavía no hay checks registrados para este monitor.
        </p>
      ) : (
        <ol className="space-y-2">
          {history.map((entry) => (
            <li
              key={entry.id}
              className={`flex items-start gap-3 border-l-4 pl-4 py-2 ${
                entry.changed
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-green-500 bg-green-50'
              }`}
            >
              <span
                className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                  entry.changed ? 'bg-orange-500' : 'bg-green-500'
                }`}
              />
              <div>
                <div className="text-sm font-medium">
                  {formatDate(entry.checked_at)} —{' '}
                  {entry.changed ? 'Cambió' : 'Sin cambios'}
                </div>
                {entry.extracted_value !== null && (
                  <div className="text-sm text-gray-700">
                    Valor: {entry.extracted_value}
                  </div>
                )}
                {entry.text_excerpt && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {entry.text_excerpt}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}