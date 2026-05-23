# Integración Flutter → Backend (sin cambiar hardware a WiFi)

Si sigues usando **Bluetooth** en el Arduino actual, la app Flutter puede reenviar eventos al servidor cuando reciba mensajes del brazo.

## Endpoint

```
POST http://<IP_PUBLICA>:3000/api/logs
Content-Type: application/json
```

## Cuerpo JSON (ejemplos alineados con tu protocolo)

### Distancia (mensaje `D45`)

```json
{
  "device_id": "brazo-robot-01",
  "event_type": "Sensor",
  "description": "Lectura ultrasónico",
  "data_payload": { "distancia_cm": 45 }
}
```

### Objeto detectado (mensaje `OBJETO`)

```json
{
  "device_id": "brazo-robot-01",
  "event_type": "Alerta",
  "description": "Objeto detectado enfrente",
  "data_payload": { "distancia_cm": 45 }
}
```

### Movimiento de servo (al enviar `B90`, `A90`, etc.)

```json
{
  "device_id": "brazo-robot-01",
  "event_type": "Movimiento",
  "description": "Comando base",
  "data_payload": { "comando": "B", "angulo": 90 }
}
```

## Ejemplo en Dart (`http` package)

Agrega en `pubspec.yaml`: `http: ^1.2.0`

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

const String logServerUrl = 'http://TU_IP_PUBLICA:3000/api/logs';
const String deviceId = 'brazo-robot-01';

Future<void> enviarLog({
  required String eventType,
  required String description,
  Map<String, dynamic> payload = const {},
}) async {
  try {
    await http.post(
      Uri.parse(logServerUrl),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'device_id': deviceId,
        'event_type': eventType,
        'description': description,
        'data_payload': payload,
      }),
    );
  } catch (e) {
    debugPrint('Error enviando log: $e');
  }
}
```

En `procesarMensajeArduino`, después de actualizar `distancia`:

```dart
await enviarLog(
  eventType: 'Sensor',
  description: 'Lectura ultrasónico',
  payload: {'distancia_cm': distancia},
);
```

Cuando detectes `OBJETO`:

```dart
await enviarLog(
  eventType: 'Alerta',
  description: 'Objeto detectado enfrente',
  payload: {'distancia_cm': distancia},
);
```

En cada `sendCommand`, opcionalmente:

```dart
await enviarLog(
  eventType: 'Movimiento',
  description: 'Comando enviado: $command',
  payload: {'comando': command},
);
```
