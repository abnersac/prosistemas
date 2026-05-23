#!/bin/bash
# Pruebas rápidas contra el servidor (reemplaza IP)
BASE_URL="${1:-http://localhost:3000}"

echo "=== Health ==="
curl -s "$BASE_URL/api/health" | jq .

echo ""
echo "=== POST log ==="
curl -s -X POST "$BASE_URL/api/logs" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "brazo-robot-01",
    "event_type": "Movimiento",
    "description": "Prueba desde script",
    "data_payload": { "eje": "B", "angulo": 90 }
  }' | jq .

echo ""
echo "=== GET logs ==="
curl -s "$BASE_URL/api/logs?limit=5" | jq .
