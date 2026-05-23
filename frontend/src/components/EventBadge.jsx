const STYLES = {
  Movimiento: 'bg-blue-600/90 text-white',
  Alerta: 'bg-red-600/90 text-white',
  Notificación: 'bg-amber-500/90 text-black',
  Sensor: 'bg-emerald-600/90 text-white',
  Comando: 'bg-violet-600/90 text-white',
  default: 'bg-slate-600 text-white',
};

export default function EventBadge({ type }) {
  const style = STYLES[type] || STYLES.default;

  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${style}`}>
      {type}
    </span>
  );
}
