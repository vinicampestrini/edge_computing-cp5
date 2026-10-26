
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// ========================================
// WIFI E MQTT
// ========================================

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

const char* MQTT_SERVER = "3.94.168.155";
const int MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "fiware_001";

const char* TOPICO_SUBSCRIBE = "/TEF/lamp001/cmd";
const char* TOPICO_ALERTA = "/TEF/lamp001/alert";

const char* TOPICO_TEMPERATURA = "/TEF/lamp001/attrs/t";
const char* TOPICO_UMIDADE = "/TEF/lamp001/attrs/h";
const char* TOPICO_LUMINOSIDADE = "/TEF/lamp001/attrs/l";
const char* TOPICO_ESTADO = "/TEF/lamp001/attrs";

WiFiClient espClient;
PubSubClient clienteMQTT(espClient);

// ========================================
// PINOS
// ========================================

const int LED_ONBOARD = 2;
const int LED_AZUL = 25;
const int BUZZER_PIN = 26;
const int LDR_PIN = 34;
const int DHT_PIN = 15;

#define DHTTYPE DHT22

DHT dht(DHT_PIN, DHTTYPE);

// ========================================
// TEMPORIZADORES
// ========================================

unsigned long ultimaLeituraLDR = 0;
unsigned long ultimaLeituraDHT = 0;
unsigned long ultimoEstado = 0;
unsigned long ultimaPiscadaLED = 0;
unsigned long ultimoSom = 0;

const unsigned long INTERVALO_LDR = 2000;
const unsigned long INTERVALO_DHT = 3000;
const unsigned long INTERVALO_ESTADO = 5000;
const unsigned long INTERVALO_LED = 400;
const unsigned long INTERVALO_SOM = 10;

// ========================================
// ALERTAS
// ========================================

enum TipoAlerta {
  ALERTA_NORMAL,
  ALERTA_TEMPERATURA,
  ALERTA_UMIDADE,
  ALERTA_LUMINOSIDADE
};

TipoAlerta alertaAtual = ALERTA_NORMAL;

bool ledAzulLigado = false;
bool buzzerLigado = false;

const int SOM_TEMPERATURA[] = {700, 0};
const int DURACAO_TEMPERATURA[] = {250, 250};
const int TAM_TEMPERATURA = 2;

const int SOM_UMIDADE[] = {1200, 0, 1200, 0};
const int DURACAO_UMIDADE[] = {150, 100, 150, 600};
const int TAM_UMIDADE = 4;

const int SOM_LUMINOSIDADE[] = {1600, 0, 1600, 0, 1600, 0};
const int DURACAO_LUMINOSIDADE[] = {100, 100, 100, 100, 100, 700};
const int TAM_LUMINOSIDADE = 6;

int etapaSom = 0;
unsigned long inicioEtapaSom = 0;

// ========================================
// CONEXÃO WIFI
// ========================================

void conectarWiFi() {
  Serial.print("Conectando ao Wi-Fi");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi conectado!");
  Serial.print("IP local: ");
  Serial.println(WiFi.localIP());
}

// ========================================
// CONTROLE DO BUZZER
// ========================================

void desligarBuzzer() {
  noTone(BUZZER_PIN);
  buzzerLigado = false;
  etapaSom = 0;
}

void atualizarBuzzer() {
  if (alertaAtual == ALERTA_NORMAL) {
    if (buzzerLigado || etapaSom != 0) {
      desligarBuzzer();
    }
    return;
  }

  const int* frequencias;
  const int* duracoes;
  int quantidade;

  switch (alertaAtual) {
    case ALERTA_TEMPERATURA:
      frequencias = SOM_TEMPERATURA;
      duracoes = DURACAO_TEMPERATURA;
      quantidade = TAM_TEMPERATURA;
      break;

    case ALERTA_UMIDADE:
      frequencias = SOM_UMIDADE;
      duracoes = DURACAO_UMIDADE;
      quantidade = TAM_UMIDADE;
      break;

    case ALERTA_LUMINOSIDADE:
      frequencias = SOM_LUMINOSIDADE;
      duracoes = DURACAO_LUMINOSIDADE;
      quantidade = TAM_LUMINOSIDADE;
      break;

    default:
      desligarBuzzer();
      return;
  }

  unsigned long agora = millis();

  if (agora - inicioEtapaSom >=
      (unsigned long)duracoes[etapaSom]) {

    inicioEtapaSom = agora;
    etapaSom = (etapaSom + 1) % quantidade;

    if (frequencias[etapaSom] == 0) {
      noTone(BUZZER_PIN);
      buzzerLigado = false;
    } else {
      tone(BUZZER_PIN, frequencias[etapaSom]);
      buzzerLigado = true;
    }
  }
}

// ========================================
// CONTROLE DO LED AZUL
// ========================================

void atualizarLED() {
  if (alertaAtual == ALERTA_NORMAL) {
    digitalWrite(LED_AZUL, LOW);
    ledAzulLigado = false;
    return;
  }

  unsigned long agora = millis();

  if (agora - ultimaPiscadaLED >= INTERVALO_LED) {
    ultimaPiscadaLED = agora;
    ledAzulLigado = !ledAzulLigado;

    digitalWrite(
      LED_AZUL,
      ledAzulLigado ? HIGH : LOW
    );
  }
}

// ========================================
// RECEBIMENTO DE COMANDOS MQTT
// ========================================

void callback(char* topico, byte* mensagem, unsigned int tamanho) {
  String conteudo = "";

  for (unsigned int cont = 0; cont < tamanho; cont++) {
    conteudo += (char)mensagem[cont];
  }

  conteudo.trim();

  Serial.print("Mensagem MQTT recebida: ");
  Serial.println(conteudo);

  // Comandos tradicionais do LED integrado
  if (String(topico) == TOPICO_SUBSCRIBE) {
    if (conteudo.indexOf("@on") >= 0) {
      digitalWrite(LED_ONBOARD, HIGH);
    } else if (conteudo.indexOf("@off") >= 0) {
      digitalWrite(LED_ONBOARD, LOW);
    }
  }

  // Alertas enviados pelo dashboard
  if (String(topico) == TOPICO_ALERTA) {
    if (conteudo == "temperatura") {
      alertaAtual = ALERTA_TEMPERATURA;
      etapaSom = 0;
      inicioEtapaSom = millis() - DURACAO_TEMPERATURA[0];
      Serial.println("Alerta de temperatura ativado.");
    } else if (conteudo == "umidade") {
      alertaAtual = ALERTA_UMIDADE;
      etapaSom = 0;
      inicioEtapaSom = millis() - DURACAO_UMIDADE[0];
      Serial.println("Alerta de umidade ativado.");
    } else if (conteudo == "luminosidade") {
      alertaAtual = ALERTA_LUMINOSIDADE;
      etapaSom = 0;
      inicioEtapaSom = millis() - DURACAO_LUMINOSIDADE[0];
      Serial.println("Alerta de luminosidade ativado.");
    } else if (conteudo == "normal") {
      alertaAtual = ALERTA_NORMAL;
      desligarBuzzer();
      digitalWrite(LED_AZUL, LOW);
      ledAzulLigado = false;
      Serial.println("Alertas encerrados. LED azul desligado.");
    }
  }
}

// ========================================
// CONEXÃO MQTT
// ========================================

void conectarMQTT() {
  while (!clienteMQTT.connected()) {
    Serial.print("Conectando ao MQTT...");

    if (clienteMQTT.connect(MQTT_CLIENT_ID)) {
      Serial.println(" conectado!");

      clienteMQTT.subscribe(TOPICO_SUBSCRIBE);
      clienteMQTT.subscribe(TOPICO_ALERTA);
    } else {
      Serial.print(" falhou. Código: ");
      Serial.println(clienteMQTT.state());
      delay(2000);
    }
  }
}

// ========================================
// PUBLICAÇÃO DOS SENSORES
// ========================================

void publicarValor(const char* topico, float valor) {
  if (!clienteMQTT.connected()) {
    return;
  }

  char mensagem[20];
  snprintf(mensagem, sizeof(mensagem), "%.2f", valor);

  if (clienteMQTT.publish(topico, mensagem)) {
    Serial.print("Publicado em ");
    Serial.print(topico);
    Serial.print(": ");
    Serial.println(mensagem);
  } else {
    Serial.print("Falha ao publicar em ");
    Serial.println(topico);
  }
}

void lerLuminosidade() {
  int leitura = analogRead(LDR_PIN);

  // Mantém a escala de 0 a 100 utilizada pelo dashboard.
  float luminosidade = map(leitura, 0, 4095, 100, 0);
  luminosidade = constrain(luminosidade, 0, 100);

  Serial.print("Luminosidade: ");
  Serial.println(luminosidade);

  publicarValor(TOPICO_LUMINOSIDADE, luminosidade);
}

void lerDHT() {
  float temperatura = dht.readTemperature();
  float umidade = dht.readHumidity();

  if (isnan(temperatura) || isnan(umidade)) {
    Serial.println("Erro na leitura do DHT22.");
    return;
  }

  Serial.print("Temperatura: ");
  Serial.print(temperatura);
  Serial.println(" °C");

  Serial.print("Umidade: ");
  Serial.print(umidade);
  Serial.println(" %");

  publicarValor(TOPICO_TEMPERATURA, temperatura);
  publicarValor(TOPICO_UMIDADE, umidade);
}

// ========================================
// SETUP
// ========================================

void setup() {
  Serial.begin(115200);

  pinMode(LED_ONBOARD, OUTPUT);
  pinMode(LED_AZUL, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(LED_ONBOARD, LOW);
  digitalWrite(LED_AZUL, LOW);
  noTone(BUZZER_PIN);

  analogReadResolution(12);

  dht.begin();

  conectarWiFi();

  clienteMQTT.setServer(MQTT_SERVER, MQTT_PORT);
  clienteMQTT.setCallback(callback);
  clienteMQTT.setKeepAlive(30);

  conectarMQTT();

  Serial.println("Sistema de monitoramento iniciado.");
}

// ========================================
// LOOP
// ========================================

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    conectarWiFi();
  }

  if (!clienteMQTT.connected()) {
    conectarMQTT();
  }

  clienteMQTT.loop();

  unsigned long agora = millis();

  if (agora - ultimaLeituraLDR >= INTERVALO_LDR) {
    ultimaLeituraLDR = agora;
    lerLuminosidade();
  }

  if (agora - ultimaLeituraDHT >= INTERVALO_DHT) {
    ultimaLeituraDHT = agora;
    lerDHT();
  }

  if (agora - ultimoEstado >= INTERVALO_ESTADO) {
    ultimoEstado = agora;

    if (clienteMQTT.connected()) {
      clienteMQTT.publish(TOPICO_ESTADO, "s|on");
    }
  }

  atualizarLED();
  atualizarBuzzer();
}
