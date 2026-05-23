const API_BASE = import.meta.env.VITE_API_URL || '';

export async function fetchLogs(limit = 50) {
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
