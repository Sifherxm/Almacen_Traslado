#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Firebase_ESP_Client.h>
#include <SPI.h>
#include <MFRC522.h>
#include <time.h>

// -------- WIFI --------
#define WIFI_SSID "NavaVal"
#define WIFI_PASSWORD "maximo12"

// -------- FIREBASE --------
#define API_KEY "AIzaSyAtk_GeNUEOzBQnPQvJsUEdQVEGaQRExg8"
#define DATABASE_URL "https://traslado-almacen-default-rtdb.firebaseio.com/"
#define DATABASE_SECRET "Vai7xSOJb66Ig0ZKCrjmPB8y6Ro4rvjO360qjGoD"

// -------- RFID --------
#define SS_PIN 5
#define RST_PIN 22

// -------- LED --------
#define LED_PIN 2

MFRC522 mfrc522(SS_PIN, RST_PIN);

// Firebase
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// México UTC-6
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = -21600;
const int daylightOffset_sec = 0;

void setup() {

  Serial.begin(115200);
  SPI.begin();
  mfrc522.PCD_Init();

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Conectar WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }

  Serial.println("\nWiFi conectado");

  // Configurar hora
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  Serial.print("Sincronizando hora");
  struct tm timeinfo;

  while (!getLocalTime(&timeinfo)) {
    Serial.print(".");
    delay(500);
  }

  Serial.println("\nHora sincronizada");

  // -------- Firebase --------
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = DATABASE_SECRET;
  config.timeout.serverResponse = 10000;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Sistema listo. Acerca una tarjeta...");
}

void loop() {

  // Mantener WiFi conectado
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
  }

  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  String uid = "";

  for (byte i = 0; i < mfrc522.uid.size; i++) {
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }

  uid.toUpperCase();

  Serial.print("UID detectado: ");
  Serial.println(uid);

  String path = "/registros/" + uid;

  // VERIFICAR SI YA EXISTE
  if (Firebase.RTDB.get(&fbdo, path)) {

    if (fbdo.dataType() != "null") {
      Serial.println("ESTA TARJETA YA ESTA REGISTRADA\n");
      delay(3000);
      return;
    }

  } else {

    // Si la ruta no existe, lo tratamos como nuevo
    if (fbdo.errorReason() != "path not exist") {
      Serial.println("Error consultando Firebase");
      Serial.println(fbdo.errorReason());
      return;
    }
  }

  // Obtener fecha y hora
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Error obteniendo hora");
    return;
  }

  char fecha[11];
  char hora[9];

  strftime(fecha, sizeof(fecha), "%Y-%m-%d", &timeinfo);
  strftime(hora, sizeof(hora), "%H:%M:%S", &timeinfo);

  FirebaseJson json;
  json.set("uid", uid);
  json.set("fecha", fecha);
  json.set("hora", hora);

  // GUARDAR SOLO SI NO EXISTE
  if (Firebase.RTDB.setJSON(&fbdo, path, &json)) {

    Serial.println("Registro guardado correctamente\n");

    digitalWrite(LED_PIN, HIGH);
    delay(1000);
    digitalWrite(LED_PIN, LOW);

  } else {

    Serial.println("Error guardando en Firebase");
    Serial.println(fbdo.errorReason());
  }

  delay(3000);
}