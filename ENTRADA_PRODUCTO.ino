#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Firebase_ESP_Client.h>
#include <SPI.h>
#include <MFRC522.h>
#include <time.h>

// -------- WIFI --------
#define WIFI_SSID "INFINITUM9B08"
#define WIFI_PASSWORD "qMs3Y74dx7"

// -------- FIREBASE --------
#define API_KEY "AIzaSyAtk_GeNUEOzBQnPQvJsUEdQVEGaQRExg8"
#define DATABASE_URL "https://traslado-almacen-default-rtdb.firebaseio.com/"
#define DATABASE_SECRET "Vai7xSOJb66Ig0ZKCrjmPB8y6Ro4rvjO360qjGoD"

// -------- DEFINIR ALMACEN --------
#define ALMACEN "B"   // CAMBIAR A "B" EN EL OTRO ESP

// -------- RFID --------
#define SS_PIN 5
#define RST_PIN 22
#define LED_PIN 2

MFRC522 mfrc522(SS_PIN, RST_PIN);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

void setup() {

  Serial.begin(115200);
  SPI.begin();
  mfrc522.PCD_Init();
  pinMode(LED_PIN, OUTPUT);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = DATABASE_SECRET;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

configTime(-6 * 3600, 0, "pool.ntp.org");

  Serial.println("Sistema listo...");
}

void loop() {

  if (!Firebase.ready()) return;
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  // ===== OBTENER UID =====
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++)
    uid += String(mfrc522.uid.uidByte[i], HEX);

  uid.toUpperCase();

  Serial.println("UID: " + uid);

  String path = "/lotes/" + uid;

  // ===== OBTENER DATOS DE FIREBASE =====
 if (!Firebase.RTDB.getJSON(&fbdo, path)) {

  String err = fbdo.errorReason();

  if (err.indexOf("path not exist") >= 0 || fbdo.httpCode() == 404) {
    Serial.println("Tarjeta no enlazada al sistema");
  } else {
    Serial.println("Error Firebase: " + err);
  }

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  delay(2000);

  return;
}
 if (fbdo.dataType() == "null") {
  Serial.println("Tarjeta no enlazada al sistema");

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  delay(2000);

  return;
}

  FirebaseJson &json = fbdo.jsonObject();
  FirebaseJsonData data;

  json.get(data, "ubicacion");
  String ubicacionActual = data.stringValue;

  String ultimoAlmacen = "";
  json.get(data, "ultimo_almacen");
  if (data.success)
    ultimoAlmacen = data.stringValue;

  Serial.println("Ubicacion actual: " + ubicacionActual);
  Serial.println("Ultimo almacen: " + ultimoAlmacen);

  String tipoMovimiento = "";

  // ===== LOGICA PRINCIPAL =====

  // ----- SALIDA -----
  if (ubicacionActual == ALMACEN) {

    tipoMovimiento = "SALIDA";

    Firebase.RTDB.setString(&fbdo, path + "/ubicacion", "TRANSITO");
    Firebase.RTDB.setString(&fbdo, path + "/ultimo_almacen", ALMACEN);

    Serial.println("Producto enviado a TRANSITO");
  }

  // ----- ENTRADA -----
  else if (ubicacionActual == "TRANSITO") {

    //  NO PERMITIR REGRESAR AL MISMO ALMACEN
    if (ultimoAlmacen == ALMACEN) {
      Serial.println("No puede regresar al mismo almacen.");
      return;
    }

    tipoMovimiento = "ENTRADA";

    Firebase.RTDB.setString(&fbdo, path + "/ubicacion", ALMACEN);

    Serial.println("Producto ingresado a " + String(ALMACEN));
  }

  // ----- BLOQUEO -----
  else {

    Serial.println("No pertenece a este almacen.");
    return;
  }

  // ===== REGISTRAR MOVIMIENTO =====

  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return;

  char fecha[11];
  char hora[9];

  strftime(fecha, sizeof(fecha), "%Y-%m-%d", &timeinfo);
  strftime(hora, sizeof(hora), "%H:%M:%S", &timeinfo);

  FirebaseJson movimiento;
  movimiento.set("uid", uid);
  movimiento.set("tipo", tipoMovimiento);
  movimiento.set("almacen", ALMACEN);
  movimiento.set("fecha", fecha);
  movimiento.set("hora", hora);

  Firebase.RTDB.pushJSON(&fbdo, "/movimientos", &movimiento);

  // ===== FEEDBACK VISUAL =====
  digitalWrite(LED_PIN, HIGH);
  delay(800);
  digitalWrite(LED_PIN, LOW);

  delay(3000);
  
  delay(3000);
  mfrc522.PICC_HaltA();
mfrc522.PCD_StopCrypto1();
}