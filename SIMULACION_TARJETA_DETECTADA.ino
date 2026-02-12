#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 5
#define RST_PIN 21

MFRC522 mfrc522(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  SPI.begin(18, 19, 23, SS_PIN);
  SPI.setFrequency(1000000);
  mfrc522.PCD_Init();
  Serial.println("Listo");
}

void loop() {
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  Serial.println("Tarjeta detectada");
  delay(1000);
}