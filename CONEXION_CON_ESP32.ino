//Encender led para comprobar conexion con ESP32
#define LED 2

void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);

  Serial.println("ESP32 funcionando correctamente");
}

void loop() {

  digitalWrite(LED, HIGH);
  Serial.println("LED ENCENDIDO");
  delay(1000);

  digitalWrite(LED, LOW);
  Serial.println("LED APAGADO");
  delay(1000);

}
