import { useCallback, useEffect, useState } from 'react';
import { fetchHealth, fetchLogs } from './api';
import LogsTable from './components/LogsTable';

const REFRESH_MS = 10000;

export default function App() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [health, setHealth] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [logsRes, healthRes] = await Promise.all([fetchLogs(50), fetchHealth()]);
      setEvents(logsRes.data || []);
      setTotal(logsRes.total ?? 0);
      setHealth(healthRes);
    } catch (err) {
      setError(err.message || 'Error de conexión con el backend');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!autoRefresh) return undefined;

    const timer = setInterval(loadData, REFRESH_MS);
    return () => clearInterval(timer);
  }, [autoRefresh, loadData]);

  const dbOk = health?.database === 'connected';

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard Brazo Robótico</h1>
            <p className="text-sm text-slate-400">Monitoreo de eventos en tiempo real</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                dbOk ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-red-400'
              }`}
            >
              DB: {dbOk ? 'Conectada' : 'Desconectada'}
            </span>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh (10s)
            </label>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-slate-700 bg-gradient-to-br from-blue-900/40 to-slate-900 p-6">
            <p className="text-sm text-slate-400">Total de eventos</p>
            <p className="mt-2 text-4xl font-bold text-white">{total}</p>
          </article>
          <article className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 sm:col-span-2">
            <p className="text-sm text-slate-400">Últimos eventos mostrados</p>
            <p className="mt-2 text-2xl font-semibold">{events.length} / {total}</p>
          </article>
        </section>

        {error && (
          <div className="rounded-lg border border-red-700 bg-red-950/50 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        <section>
          <h2 className="mb-4 text-lg font-semibold">Registro de eventos</h2>
          <LogsTable events={events} />
        </section>
      </main>
    </div>
  );
}
