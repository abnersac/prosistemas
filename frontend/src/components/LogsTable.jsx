import EventBadge from './EventBadge';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-GT');
}

function formatPayload(payload) {
  if (!payload || Object.keys(payload).length === 0) return '-';
  return JSON.stringify(payload);
}

export default function LogsTable({ events }) {
  if (!events.length) {
    return (
      <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-8 text-center text-slate-400">
        No hay eventos registrados todavía.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="min-w-full divide-y divide-slate-700 text-sm">
        <thead className="bg-slate-900">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Fecha</th>
            <th className="px-4 py-3 text-left font-semibold">Dispositivo</th>
            <th className="px-4 py-3 text-left font-semibold">Tipo</th>
            <th className="px-4 py-3 text-left font-semibold">Descripción</th>
            <th className="px-4 py-3 text-left font-semibold">Datos</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-900/40">
          {events.map((event) => (
            <tr key={event._id} className="hover:bg-slate-800/50">
              <td className="whitespace-nowrap px-4 py-3">{formatDate(event.timestamp)}</td>
              <td className="px-4 py-3 font-mono text-xs">{event.device_id}</td>
              <td className="px-4 py-3">
                <EventBadge type={event.event_type} />
              </td>
              <td className="px-4 py-3">{event.description || '-'}</td>
              <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-slate-400" title={formatPayload(event.data_payload)}>
                {formatPayload(event.data_payload)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
