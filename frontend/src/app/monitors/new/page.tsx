'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createMonitor } from '@/lib/api';
import { CreateMonitorPayload, RuleType } from '@/types/monitors';

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  hash_diff: 'Cualquier cambio en el contenido',
  text_contains: 'Contiene un texto específico',
  text_not_contains: 'No contiene un texto específico',
  price_threshold: 'Umbral de precio/valor numérico',
  availability: 'Disponibilidad (en stock / agotado)',
};

export default function NewMonitorPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [selector, setSelector] = useState('');
  const [ruleType, setRuleType] = useState<RuleType>('hash_diff');

  // Campos específicos por rule_type
  const [textValue, setTextValue] = useState('');
  const [operator, setOperator] = useState<'lt' | 'lte' | 'gt' | 'gte'>('lt');
  const [thresholdValue, setThresholdValue] = useState(0);
  const [expect, setExpect] = useState<'in_stock' | 'out_of_stock'>('in_stock');
  const [inStockKeywords, setInStockKeywords] = useState('en existencia');
  const [outOfStockKeywords, setOutOfStockKeywords] = useState('agotado');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function buildPayload(): CreateMonitorPayload {
    const base = {
      name,
      url,
      intervalMinutes,
      ...(selector ? { selector } : {}),
    };

    switch (ruleType) {
      case 'hash_diff':
        return { ...base, ruleType: 'hash_diff' };
      case 'text_contains':
      case 'text_not_contains':
        return { ...base, ruleType, ruleConfig: { text: textValue } };
      case 'price_threshold':
        return {
          ...base,
          ruleType: 'price_threshold',
          ruleConfig: { operator, value: thresholdValue },
        };
      case 'availability':
        return {
          ...base,
          ruleType: 'availability',
          ruleConfig: {
            expect,
            map: {
              in_stock: inStockKeywords.split(',').map((s) => s.trim()),
              out_of_stock: outOfStockKeywords.split(',').map((s) => s.trim()),
            },
          },
        };
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const monitor = await createMonitor(buildPayload());
      router.push(`/monitors/${monitor.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto p-8">
      <a href="/" className="text-sm text-blue-600 hover:underline">
        ← Volver a monitores
      </a>

      <h1 className="text-2xl font-bold mt-2 mb-6">Nuevo monitor</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">URL</label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Intervalo (minutos)
          </label>
          <input
            type="number"
            required
            min={1}
            value={intervalMinutes}
            onChange={(e) => setIntervalMinutes(Number(e.target.value))}
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Selector CSS (opcional)
          </label>
          <input
            type="text"
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
            placeholder=".summary.entry-summary"
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Tipo de regla
          </label>
          <select
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value as RuleType)}
            className="w-full border rounded-lg p-2"
          >
            {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {(ruleType === 'text_contains' || ruleType === 'text_not_contains') && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Texto a buscar
            </label>
            <input
              type="text"
              required
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              className="w-full border rounded-lg p-2"
            />
          </div>
        )}

        {ruleType === 'price_threshold' && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                Condición
              </label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as typeof operator)}
                className="w-full border rounded-lg p-2"
              >
                <option value="lt">Menor que</option>
                <option value="lte">Menor o igual que</option>
                <option value="gt">Mayor que</option>
                <option value="gte">Mayor o igual que</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Valor</label>
              <input
                type="number"
                required
                value={thresholdValue}
                onChange={(e) => setThresholdValue(Number(e.target.value))}
                className="w-full border rounded-lg p-2"
              />
            </div>
          </div>
        )}

        {ruleType === 'availability' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Avisar cuando esté
              </label>
              <select
                value={expect}
                onChange={(e) => setExpect(e.target.value as typeof expect)}
                className="w-full border rounded-lg p-2"
              >
                <option value="in_stock">En existencia</option>
                <option value="out_of_stock">Agotado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Palabras clave para &quot;en existencia&quot; (separadas por coma)
              </label>
              <input
                type="text"
                value={inStockKeywords}
                onChange={(e) => setInStockKeywords(e.target.value)}
                className="w-full border rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Palabras clave para &quot;agotado&quot; (separadas por coma)
              </label>
              <input
                type="text"
                value={outOfStockKeywords}
                onChange={(e) => setOutOfStockKeywords(e.target.value)}
                className="w-full border rounded-lg p-2"
              />
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white rounded-lg p-2 font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Creando...' : 'Crear monitor'}
        </button>
      </form>
    </main>
  );
}