const API_BASE = import.meta.env.VITE_API_URL || '';

export async function fetchLogs(limit = 500) {
  const response = await fetch(`${API_BASE}/api/logs?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Error al cargar logs (${response.status})`);
  }
  return response.json();
}

export async function fetchHealth() {
  const response = await fetch(`${API_BASE}/api/health`);
  return response.json();
}

export async function postLog(body) {
  const response = await fetch(`${API_BASE}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Error al enviar (${response.status})`);
  }
  return data;
}

export async function sendCommandToRobot({ deviceId, command, commandName }) {
  return postLog({
    device_id: deviceId,
    event_type: 'Comando',
    description: `Comando enviado desde servidor: ${commandName} (${command})`,
    data_payload: {
      command,
      command_name: commandName,
      source: 'dashboard',
      status: 'sent',
    },
  });
}
