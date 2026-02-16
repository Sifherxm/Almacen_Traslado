#include <WiFi.h>

// -------- WIFI --------
#define WIFI_SSID "Sifherx"
#define WIFI_PASSWORD "Smau3131"

void setup() {
  Serial.begin(115200);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Conectando a WiFi");

  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    Serial.print(".");
    delay(500);
    intentos++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi conectado correctamente");
    Serial.print("Dirección IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nNo se pudo conectar al WiFi");
  }
}

void loop() {
  // Verificar constantemente si sigue conectado
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi sigue conectado");
  } else {
    Serial.println("WiFi desconectado");
  }

  delay(5000); // Verifica cada 5 segundos
}