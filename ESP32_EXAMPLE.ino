#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

const char* serverUrl = "YOUR_SUPABASE_URL/functions/v1/ingest";
const char* deviceKey = "YOUR_DEVICE_API_KEY";

void setup() {
  Serial.begin(115200);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    float temperature = readTemperature();
    float humidity = readHumidity();
    int light = readLight();

    StaticJsonDocument<512> doc;
    doc["device_key"] = deviceKey;

    JsonArray readings = doc.createNestedArray("readings");

    JsonObject tempReading = readings.createNestedObject();
    tempReading["sensor_name"] = "temp";
    tempReading["value"] = temperature;

    JsonObject humidityReading = readings.createNestedObject();
    humidityReading["sensor_name"] = "humidity";
    humidityReading["value"] = humidity;

    JsonObject lightReading = readings.createNestedObject();
    lightReading["sensor_name"] = "light";
    lightReading["value"] = light;

    String jsonString;
    serializeJson(doc, jsonString);

    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    int httpResponseCode = http.POST(jsonString);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Response code: " + String(httpResponseCode));
      Serial.println("Response: " + response);
    } else {
      Serial.println("Error sending data: " + String(httpResponseCode));
    }

    http.end();
  } else {
    Serial.println("WiFi disconnected");
  }

  delay(30000);
}

float readTemperature() {
  return random(200, 300) / 10.0;
}

float readHumidity() {
  return random(300, 700) / 10.0;
}

int readLight() {
  return random(0, 1000);
}
