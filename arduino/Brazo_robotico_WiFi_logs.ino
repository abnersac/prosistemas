/*
 * Brazo robótico - Nano 33 IoT con envío de logs por WiFi
 * Basado en tu sketch Bluetooth; agrega POST HTTP al backend.
 *
 * Librerías: WiFiNINA, ArduinoHttpClient, ArduinoJson (opcional si envías JSON manual)
 * Configura WIFI_SSID, WIFI_PASS y SERVER_IP (IP pública del droplet/VPS)
 */

#include <WiFiNINA.h>
#include <ArduinoHttpClient.h>
#include <Servo.h>

const char* WIFI_SSID = "TU_RED_WIFI";
const char* WIFI_PASS = "TU_PASSWORD_WIFI";
const char* SERVER_HOST = "157.230.187.111";
const int SERVER_PORT = 3000;
const char* DEVICE_ID = "brazo-robot-01";

WiFiClient wifiClient;
HttpClient httpClient = HttpClient(wifiClient, SERVER_HOST, SERVER_PORT);

Servo servoBase;
Servo servoBrazo1;
Servo servoBrazo2;
Servo servoPinza;

const int trigPin = 7;
const int echoPin = 8;

int base = 90;
int brazo1 = 90;
int brazo2 = 90;
int pinza = 40;

unsigned long lastSensorCheck = 0;
bool objetoAnterior = false;

void setup() {
  Serial.begin(9600);

  servoBase.attach(3);
  servoBrazo1.attach(5);
  servoBrazo2.attach(6);
  servoPinza.attach(9);

  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  conectarWiFi();

  servoBase.write(base);
  servoBrazo1.write(brazo1);
  servoBrazo2.write(brazo2);
  servoPinza.write(pinza);

  enviarLog("Notificación", "Sistema iniciado", "{}");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    conectarWiFi();
  }

  if (millis() - lastSensorCheck > 2000) {
    lastSensorCheck = millis();
    detectarObjeto();
  }

  delay(50);
}

void conectarWiFi() {
  Serial.print("Conectando WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 30) {
    delay(500);
    Serial.print(".");
    intentos++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("WiFi OK. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nError WiFi");
  }
}

void enviarLog(const char* eventType, const char* description, const String& payloadJson) {
  if (WiFi.status() != WL_CONNECTED) return;

  String body = "{";
  body += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  body += "\"event_type\":\"" + String(eventType) + "\",";
  body += "\"description\":\"" + String(description) + "\",";
  body += "\"data_payload\":" + payloadJson;
  body += "}";

  httpClient.beginRequest();
  httpClient.post("/api/logs");
  httpClient.sendHeader("Content-Type", "application/json");
  httpClient.sendHeader("Content-Length", body.length());
  httpClient.beginBody();
  httpClient.print(body);
  httpClient.endRequest();

  int statusCode = httpClient.responseStatusCode();
  httpClient.responseStatusCode(); // limpiar buffer
  while (httpClient.available()) httpClient.read();

  Serial.print("Log enviado [");
  Serial.print(statusCode);
  Serial.print("] ");
  Serial.println(description);
}

void moverServo(Servo& servo, int& valorGuardado, int nuevoValor, const char* eje) {
  valorGuardado = constrain(nuevoValor, 10, 170);
  servo.write(valorGuardado);

  String payload = "{\"eje\":\"" + String(eje) + "\",\"angulo\":" + String(valorGuardado) + "}";
  enviarLog("Movimiento", "Ajuste de servo", payload);
}

void detectarObjeto() {
  int distance = medirDistancia();
  if (distance == 0) return;

  String payloadDist = "{\"distancia_cm\":" + String(distance) + "}";
  enviarLog("Sensor", "Lectura ultrasónico", payloadDist);

  bool objetoAhora = (distance > 0 && distance <= 50);

  if (objetoAhora && !objetoAnterior) {
    enviarLog("Alerta", "Objeto detectado enfrente", payloadDist);
  }

  objetoAnterior = objetoAhora;
}

int medirDistancia() {
  long suma = 0;
  int lecturasValidas = 0;

  for (int i = 0; i < 3; i++) {
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    long duration = pulseIn(echoPin, HIGH, 12000);

    if (duration > 0) {
      int distance = duration * 0.034 / 2;
      if (distance >= 2 && distance <= 150) {
        suma += distance;
        lecturasValidas++;
      }
    }
    delay(30);
  }

  if (lecturasValidas == 0) return 0;
  return suma / lecturasValidas;
}
