#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Firebase_ESP_Client.h>
#include <SPI.h>
#include <MFRC522.h>
#include <time.h>

// =========================
// WIFI
// =========================
#define WIFI_SSID "INFINITUM14A3"
#define WIFI_PASSWORD "ED7y67gXJe"

// =========================
// FIREBASE
// =========================
#define API_KEY "AIzaSyAtk_GeNUEOzBQnPQvJsUEdQVEGaQRExg8"
#define DATABASE_URL "https://traslado-almacen-default-rtdb.firebaseio.com/"
#define DATABASE_SECRET "Vai7xSOJb66Ig0ZKCrjmPB8y6Ro4rvjO360qjGoD"

// =========================
// DISPOSITIVO
// CAMBIA ESTO EN CADA ESP32
// =========================
#define DISPOSITIVO "ESP_ALMACEN_B"   // CAMBIAR A ESP_ALMACEN_B EN EL OTRO

// =========================
// RFID
// =========================
#define SS_PIN 5
#define RST_PIN 22
#define LED_PIN 2

MFRC522 mfrc522(SS_PIN, RST_PIN);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// =========================
// AUXILIARES
// =========================
bool sincronizarHora() {
  configTime(-6 * 3600, 0, "pool.ntp.org", "time.nist.gov");

  Serial.print("Sincronizando hora");

  struct tm timeinfo;
  int intentos = 0;

  while (!getLocalTime(&timeinfo) && intentos < 20) {
    Serial.print(".");
    delay(500);
    intentos++;
  }

  Serial.println();

  if (!getLocalTime(&timeinfo)) {
    Serial.println("No se pudo sincronizar la hora");
    return false;
  }

  Serial.println("Hora sincronizada");
  Serial.println(&timeinfo, "%Y-%m-%d %H:%M:%S");
  return true;
}

String obtenerFechaHora() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "SIN_HORA";
  }

  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(buffer);
}

String leerUIDTarjeta() {
  if (!mfrc522.PICC_IsNewCardPresent()) return "";
  if (!mfrc522.PICC_ReadCardSerial()) return "";

  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }

  uid.toUpperCase();
  return uid;
}

void cerrarLecturaRFID() {
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}

void parpadeoExito() {
  digitalWrite(LED_PIN, HIGH);
  delay(250);
  digitalWrite(LED_PIN, LOW);
}

void parpadeoError() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(120);
    digitalWrite(LED_PIN, LOW);
    delay(120);
  }
}

bool publicarEscaneo(String uid) {
  FirebaseJson evento;
  evento.set("uid", uid);
  evento.set("lector", DISPOSITIVO);
  evento.set("timestamp", obtenerFechaHora());
  evento.set("millis", (int)millis());

  String pathUltimo = "/escaneos/" + String(DISPOSITIVO) + "/ultimo";
  bool ok1 = Firebase.RTDB.setJSON(&fbdo, pathUltimo, &evento);

  if (!ok1) {
    Serial.println("Error escribiendo ultimo: " + fbdo.errorReason());
    return false;
  }

  bool ok2 = Firebase.RTDB.pushJSON(&fbdo, "/escaneos_log", &evento);

  if (!ok2) {
    Serial.println("Error escribiendo log: " + fbdo.errorReason());
    return false;
  }

  return true;
}

// =========================
// SETUP
// =========================
void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  SPI.begin();
  mfrc522.PCD_Init();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println();
  Serial.println("WiFi conectado");
  Serial.println(WiFi.localIP());

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = DATABASE_SECRET;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  delay(2000);
  sincronizarHora();

  Serial.println("Lector listo: " + String(DISPOSITIVO));
}

// =========================
// LOOP
// =========================
void loop() {
  if (!Firebase.ready()) return;

  String uid = leerUIDTarjeta();
  if (uid == "") return;

  Serial.println("UID detectado: " + uid);
  cerrarLecturaRFID();

  if (publicarEscaneo(uid)) {
    Serial.println("Escaneo enviado a Firebase");
    parpadeoExito();
  } else {
    Serial.println("Error publicando escaneo");
    parpadeoError();
  }

  delay(1500);
}