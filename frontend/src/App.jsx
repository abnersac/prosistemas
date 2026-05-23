import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchHealth, fetchLogs, markCommandTimeout, sendCommandToRobot } from './api';
import EventBadge from './components/EventBadge';
import LogsTable from './components/LogsTable';

const POLL_MS = 1000;
const PAGE_SIZE = 20;
const ROBOT_TIMEOUT_MS = 30000;
const DEFAULT_DEVICE = 'brazo-robot-01';

const COMMAND_CATALOG = [
  { id: 'b60', name: 'Base izquierda', code: 'B60', category: 'Movimiento' },
  { id: 'b90', name: 'Base centro', code: 'B90', category: 'Movimiento' },
  { id: 'b120', name: 'Base derecha', code: 'B120', category: 'Movimiento' },
  { id: 'a110', name: 'Brazo 1 subir', code: 'A110', category: 'Movimiento' },
  { id: 'a70', name: 'Brazo 1 bajar', code: 'A70', category: 'Movimiento' },
  { id: 'c110', name: 'Brazo 2 subir', code: 'C110', category: 'Movimiento' },
  { id: 'c70', name: 'Brazo 2 bajar', code: 'C70', category: 'Movimiento' },
  { id: 'p90', name: 'Abrir pinza', code: 'P90', category: 'Pinza' },
  { id: 'p10', name: 'Cerrar pinza', code: 'P10', category: 'Pinza' },
  { id: 'home', name: 'Posición inicial', code: 'HOME', category: 'Secuencia' },
];

const TABS = [
  { id: 'live', label: 'Logs en vivo' },
  { id: 'history', label: 'Historial' },
  { id: 'commands', label: 'Comandos' },
];

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-GT');
}

function matchesFilters(event, { deviceId, eventType, dateFrom, dateTo }) {
  if (deviceId && event.device_id !== deviceId) return false;
  if (eventType && event.event_type !== eventType) return false;
  if (dateFrom && new Date(event.timestamp) < new Date(dateFrom)) return false;
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    if (new Date(event.timestamp) > to) return false;
  }
  return true;
}

function robotAckedCommand(events, commandEventId, afterMs) {
  return events.some((ev) => {
    if (new Date(ev.timestamp).getTime() < afterMs) return false;
    const p = ev.data_payload || {};
    if (p.ack_for_event_id === commandEventId) return true;
    if (ev._id === commandEventId && p.status === 'acknowledged') return true;
    return false;
  });
}

function StatusPill({ status }) {
  const styles = {
    sent: 'bg-blue-600/30 text-blue-300',
    acknowledged: 'bg-emerald-600/30 text-emerald-300',
    timeout: 'bg-amber-600/30 text-amber-200',
    failed: 'bg-red-600/30 text-red-300',
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${styles[status] || styles.sent}`}
    >
      {status}
    </span>
  );
}

export default function App() {
  const [tab, setTab] = useState('live');
  const [allEvents, setAllEvents] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [pollOk, setPollOk] = useState(true);
  const knownIds = useRef(new Set());

  const [page, setPage] = useState(1);
  const [filterDevice, setFilterDevice] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const [cmdSearch, setCmdSearch] = useState('');
  const [cmdCategory, setCmdCategory] = useState('');
  const [cmdDevice, setCmdDevice] = useState(DEFAULT_DEVICE);
  const [sendingId, setSendingId] = useState(null);
  const [cmdLog, setCmdLog] = useState([]);
  const [cmdHistory, setCmdHistory] = useState([]);

  const pollLogs = useCallback(async () => {
    try {
      const [logsRes, healthRes] = await Promise.all([fetchLogs(500), fetchHealth()]);
      const incoming = logsRes.data || [];

      setAllEvents(incoming);
      setTotal(logsRes.total ?? incoming.length);
      setHealth(healthRes);
      setPollOk(true);
      setError('');

      const fresh = [];
      incoming.forEach((ev) => {
        if (!knownIds.current.has(ev._id)) {
          knownIds.current.add(ev._id);
          fresh.push(ev);
        }
      });

      if (fresh.length > 0) {
        setLiveEvents((prev) => [...fresh, ...prev].slice(0, 150));
      } else if (knownIds.current.size === 0 && incoming.length > 0) {
        incoming.forEach((ev) => knownIds.current.add(ev._id));
        setLiveEvents(incoming.slice(0, 150));
      }
    } catch (err) {
      setPollOk(false);
      setError(err.message || 'Error de conexión con el backend');
    }
  }, []);

  useEffect(() => {
    pollLogs();
    const timer = setInterval(pollLogs, POLL_MS);
    return () => clearInterval(timer);
  }, [pollLogs]);

  const filterOptions = useMemo(() => {
    const devices = [...new Set(allEvents.map((e) => e.device_id))].sort();
    const types = [...new Set(allEvents.map((e) => e.event_type))].sort();
    return { devices, types };
  }, [allEvents]);

  const filteredEvents = useMemo(
    () =>
      allEvents.filter((ev) =>
        matchesFilters(ev, {
          deviceId: filterDevice,
          eventType: filterType,
          dateFrom: filterFrom,
          dateTo: filterTo,
        })
      ),
    [allEvents, filterDevice, filterType, filterFrom, filterTo]
  );

  const totalPages = Math.max(Math.ceil(filteredEvents.length / PAGE_SIZE), 1);
  const pageEvents = filteredEvents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const filteredCommands = useMemo(() => {
    const term = cmdSearch.trim().toLowerCase();
    return COMMAND_CATALOG.filter((cmd) => {
      if (cmdCategory && cmd.category !== cmdCategory) return false;
      if (!term) return true;
      return (
        cmd.name.toLowerCase().includes(term) ||
        cmd.code.toLowerCase().includes(term) ||
        cmd.category.toLowerCase().includes(term)
      );
    });
  }, [cmdSearch, cmdCategory]);

  const cmdCategories = useMemo(
    () => [...new Set(COMMAND_CATALOG.map((c) => c.category))],
    []
  );

  const pushCmdLog = (entry) => {
    setCmdLog((prev) => [entry, ...prev].slice(0, 60));
  };

  const handleSendCommand = async (cmd) => {
    setSendingId(cmd.id);
    const sentAt = Date.now();
    const historyId = `${cmd.id}-${sentAt}`;

    setCmdHistory((prev) => [
      {
        id: historyId,
        command: cmd.code,
        name: cmd.name,
        status: 'sent',
        message: 'Enviado al servidor',
        at: new Date().toISOString(),
      },
      ...prev,
    ].slice(0, 30));

    pushCmdLog({
      level: 'info',
      message: `Enviando ${cmd.name} (${cmd.code})…`,
      at: new Date().toISOString(),
    });

    try {
      const res = await sendCommandToRobot({
        deviceId: cmdDevice,
        command: cmd.code,
        commandName: cmd.name,
      });
      const commandEventId = res.data?._id;

      pushCmdLog({
        level: 'ok',
        message: `Comando ${cmd.code} en cola. La app Flutter debe estar conectada por Bluetooth.`,
        at: new Date().toISOString(),
      });

      const checkResponse = setInterval(async () => {
        try {
          const logsRes = await fetchLogs(80);
          if (commandEventId && robotAckedCommand(logsRes.data || [], commandEventId, sentAt)) {
            clearInterval(checkResponse);
            clearTimeout(timeoutId);
            const msg = `Robot confirmó ejecución: ${cmd.code}`;
            pushCmdLog({ level: 'ok', message: msg, at: new Date().toISOString() });
            setCmdHistory((prev) =>
              prev.map((h) =>
                h.id === historyId ? { ...h, status: 'acknowledged', message: msg } : h
              )
            );
          }
        } catch {
          /* reintento en siguiente ciclo */
        }
      }, 2000);

      const timeoutId = setTimeout(async () => {
        clearInterval(checkResponse);
        const msg =
          'El robot no respondió en 30 s. Verifique la app Flutter y la conexión Bluetooth.';
        if (commandEventId) {
          try {
            await markCommandTimeout(commandEventId);
          } catch {
            /* ignorar */
          }
        }
        pushCmdLog({ level: 'error', message: msg, at: new Date().toISOString() });
        setCmdHistory((prev) =>
          prev.map((h) =>
            h.id === historyId ? { ...h, status: 'timeout', message: msg } : h
          )
        );
      }, ROBOT_TIMEOUT_MS);
    } catch (err) {
      const msg = err.message || 'Error al enviar comando';
      pushCmdLog({ level: 'error', message: msg, at: new Date().toISOString() });
      setCmdHistory((prev) =>
        prev.map((h) =>
          h.id === historyId ? { ...h, status: 'failed', message: msg } : h
        )
      );
      setError(msg);
    } finally {
      setSendingId(null);
    }
  };

  const dbOk = health?.database === 'connected';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Control de Brazo Robótico</h1>
              <p className="text-sm text-slate-400">
                Actualización en vivo cada {POLL_MS / 1000}s (equivalente a tiempo real)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  dbOk ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-red-400'
                }`}
              >
                DB: {dbOk ? 'Conectada' : 'Desconectada'}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  pollOk ? 'bg-blue-600/20 text-blue-300' : 'bg-red-600/20 text-red-300'
                }`}
              >
                Sync: {pollOk ? 'Activo' : 'Error'}
              </span>
            </div>
          </div>
          <nav className="mt-4 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  tab === t.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        {error && (
          <div className="rounded-lg border border-red-700 bg-red-950/50 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
            <p className="text-sm text-slate-400">Total en base de datos</p>
            <p className="mt-1 text-3xl font-bold">{total}</p>
          </article>
          <article className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
            <p className="text-sm text-slate-400">En vivo (últimos detectados)</p>
            <p className="mt-1 text-3xl font-bold">{liveEvents.length}</p>
          </article>
        </section>

        {tab === 'live' && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Logs en tiempo real</h2>
            <div className="max-h-[480px] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/40">
              {liveEvents.length === 0 ? (
                <p className="p-8 text-center text-slate-500">Esperando eventos del robot…</p>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {liveEvents.map((log) => (
                    <li
                      key={log._id}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                    >
                      <span className="shrink-0 font-mono text-xs text-slate-500">
                        {formatDate(log.timestamp)}
                      </span>
                      <span className="font-mono text-xs text-blue-300">{log.device_id}</span>
                      <EventBadge type={log.event_type} />
                      <span className="flex-1 text-sm">{log.description}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {tab === 'history' && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Historial de eventos</h2>
            <form
              className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/40 p-4 sm:grid-cols-2 lg:grid-cols-5"
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
              }}
            >
              <label className="text-sm">
                <span className="text-slate-400">Robot</span>
                <select
                  value={filterDevice}
                  onChange={(e) => {
                    setFilterDevice(e.target.value);
                    setPage(1);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
                >
                  <option value="">Todos</option>
                  {filterOptions.devices.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-slate-400">Tipo</span>
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setPage(1);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
                >
                  <option value="">Todos</option>
                  {filterOptions.types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-slate-400">Desde</span>
                <input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => {
                    setFilterFrom(e.target.value);
                    setPage(1);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="text-slate-400">Hasta</span>
                <input
                  type="date"
                  value={filterTo}
                  onChange={(e) => {
                    setFilterTo(e.target.value);
                    setPage(1);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
                />
              </label>
              <div className="flex items-end text-sm text-slate-400">
                {filteredEvents.length} resultados
              </div>
            </form>
            <p className="text-sm text-slate-400">
              Página {page} de {totalPages} ({PAGE_SIZE} por página)
            </p>
            <LogsTable events={pageEvents} />
            <div className="flex justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-600 px-4 py-2 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-600 px-4 py-2 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </section>
        )}

        {tab === 'commands' && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Comandos hacia el robot</h2>
            <div className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/40 p-4 sm:grid-cols-3">
              <label className="text-sm sm:col-span-1">
                <span className="text-slate-400">Robot destino</span>
                <input
                  value={cmdDevice}
                  onChange={(e) => setCmdDevice(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-mono"
                />
              </label>
              <label className="text-sm sm:col-span-1">
                <span className="text-slate-400">Buscar</span>
                <input
                  value={cmdSearch}
                  onChange={(e) => setCmdSearch(e.target.value)}
                  placeholder="base, pinza…"
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
                />
              </label>
              <label className="text-sm sm:col-span-1">
                <span className="text-slate-400">Categoría</span>
                <select
                  value={cmdCategory}
                  onChange={(e) => setCmdCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
                >
                  <option value="">Todas</option>
                  {cmdCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900 text-left">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Enviar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredCommands.map((cmd) => (
                    <tr key={cmd.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium">{cmd.name}</td>
                      <td className="px-4 py-3 font-mono text-blue-300">{cmd.code}</td>
                      <td className="px-4 py-3 text-slate-400">{cmd.category}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={sendingId === cmd.id}
                          onClick={() => handleSendCommand(cmd)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {sendingId === cmd.id ? 'Enviando…' : 'Enviar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 font-semibold">Log de envío</h3>
                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs">
                  {cmdLog.length === 0 ? (
                    <p className="text-slate-500">Sin actividad.</p>
                  ) : (
                    cmdLog.map((e, i) => (
                      <p
                        key={`${e.at}-${i}`}
                        className={
                          e.level === 'error'
                            ? 'mb-2 text-red-300'
                            : e.level === 'ok'
                              ? 'mb-2 text-emerald-300'
                              : 'mb-2 text-slate-300'
                        }
                      >
                        {formatDate(e.at)} — {e.message}
                      </p>
                    ))
                  )}
                </div>
              </div>
              <div>
                <h3 className="mb-2 font-semibold">Estado de comandos</h3>
                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-700">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className="px-2 py-2 text-left">Cmd</th>
                        <th className="px-2 py-2 text-left">Estado</th>
                        <th className="px-2 py-2 text-left">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {cmdHistory.map((h) => (
                        <tr key={h.id}>
                          <td className="px-2 py-2 font-mono">{h.command}</td>
                          <td className="px-2 py-2">
                            <StatusPill status={h.status} />
                          </td>
                          <td className="px-2 py-2 text-slate-400">{h.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Requisitos: app Flutter abierta, Bluetooth conectado al brazo. La app consulta comandos
              pendientes cada 2 s y mueve el robot. Si no hay conexión, verá timeout a los 30 s.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
