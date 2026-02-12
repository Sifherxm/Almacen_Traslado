#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 5
#define RST_PIN 22

MFRC522 mfrc522(SS_PIN, RST_PIN);

String tarjetasRegistradas[20]; // Almacen para 20 tarjetas
int totalTarjetas = 0;

void setup() {
  Serial.begin(115200);
  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println("Acerca una tarjeta RFID...");
}

void loop() {

  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  String uid = "";

  for (byte i = 0; i < mfrc522.uid.size; i++) {
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }

  uid.toUpperCase();

  Serial.print("UID detectado: ");
  Serial.println(uid);

  if (estaRegistrada(uid)) {
    Serial.println("Tarjeta ya registrada");
  } else {
    if (totalTarjetas < 20) {
      tarjetasRegistradas[totalTarjetas] = uid;
      totalTarjetas++;
      Serial.println("Tarjeta registrada correctamente");
    } else {
      Serial.println("Memoria llena");
    }
  }

  delay(2000);
}

bool estaRegistrada(String uid) {
  for (int i = 0; i < totalTarjetas; i++) {
    if (tarjetasRegistradas[i] == uid) {
      return true;
    }
  }
  return false;
}
