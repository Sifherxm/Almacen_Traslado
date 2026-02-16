#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// -------- WIFI --------
#define WIFI_SSID "Sifherx"
#define WIFI_PASSWORD "Smau3131"

// -------- FIREBASE --------
#define API_KEY "AIzaSyAtk_GeNUEOzBQnPQvJsUEdQVEGaQRExg8"
#define DATABASE_URL "https://traslado-almacen-default-rtdb.firebaseio.com/"
#define DATABASE_SECRET "Vai7xSOJb66Ig0ZKCrjmPB8y6Ro4rvjO360qjGoD"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

void setup() {
  Serial.begin(115200);

  // Conectar WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }

  Serial.println("\nWiFi conectado");

  // Configuración Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = DATABASE_SECRET;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Intentando conectar a Firebase...");

  // Intentar escribir dato simple
  if (Firebase.RTDB.setString(&fbdo, "/testConexion", "OK")) {
    Serial.println("Firebase conectado correctamente");
  } else {
    Serial.println("Error en Firebase");
    Serial.println("Motivo: " + fbdo.errorReason());
  }
}

void loop() {
}