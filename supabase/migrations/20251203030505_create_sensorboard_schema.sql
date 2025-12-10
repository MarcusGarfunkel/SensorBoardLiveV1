/*
  # SensorBoard Live - Initial Schema

  ## Overview
  Creates the core database structure for SensorBoard Live, a dashboard for monitoring
  IoT sensor data from microcontrollers (ESP32, Pico, Arduino).

  ## New Tables
  
  ### `devices`
  - `id` (uuid, primary key) - Unique device identifier
  - `user_id` (uuid, foreign key) - Owner of the device
  - `name` (text) - Human-readable device name
  - `description` (text) - Optional device description
  - `api_key` (text, unique) - Authentication key for device data ingestion
  - `created_at` (timestamptz) - Creation timestamp
  - `last_seen` (timestamptz) - Last time device sent data

  ### `sensors`
  - `id` (uuid, primary key) - Unique sensor identifier
  - `device_id` (uuid, foreign key) - Parent device
  - `name` (text) - Sensor name (e.g., "temp", "humidity")
  - `unit` (text) - Measurement unit (e.g., "°C", "%")
  - `type` (text) - Sensor type for categorization
  - `created_at` (timestamptz) - Creation timestamp

  ### `readings`
  - `id` (bigint, primary key) - Unique reading identifier
  - `sensor_id` (uuid, foreign key) - Parent sensor
  - `value` (float) - Sensor reading value
  - `timestamp` (timestamptz) - When reading was captured

  ## Security
  - RLS enabled on all tables
  - Users can only access their own devices
  - Device API keys provide programmatic access for microcontrollers
  - Public read access disabled by default

  ## Indexes
  - Fast queries on sensor_id and timestamp for historical data retrieval
  - API key lookup optimization for ingestion endpoint
*/

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  api_key text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now()
);

-- Sensors table
CREATE TABLE IF NOT EXISTS sensors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text DEFAULT '',
  type text DEFAULT 'generic',
  created_at timestamptz DEFAULT now(),
  UNIQUE(device_id, name)
);

-- Readings table
CREATE TABLE IF NOT EXISTS readings (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  sensor_id uuid NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  value float NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_readings_sensor_timestamp ON readings(sensor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_devices_api_key ON devices(api_key);
CREATE INDEX IF NOT EXISTS idx_sensors_device ON sensors(device_id);

-- Enable Row Level Security
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for devices
CREATE POLICY "Users can view own devices"
  ON devices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices"
  ON devices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices"
  ON devices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices"
  ON devices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for sensors
CREATE POLICY "Users can view sensors of own devices"
  ON sensors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = sensors.device_id
      AND devices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sensors for own devices"
  ON sensors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = sensors.device_id
      AND devices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sensors of own devices"
  ON sensors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = sensors.device_id
      AND devices.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = sensors.device_id
      AND devices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sensors of own devices"
  ON sensors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = sensors.device_id
      AND devices.user_id = auth.uid()
    )
  );

-- RLS Policies for readings
CREATE POLICY "Users can view readings of own devices"
  ON readings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sensors
      JOIN devices ON devices.id = sensors.device_id
      WHERE sensors.id = readings.sensor_id
      AND devices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert readings for own devices"
  ON readings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sensors
      JOIN devices ON devices.id = sensors.device_id
      WHERE sensors.id = readings.sensor_id
      AND devices.user_id = auth.uid()
    )
  );

-- Function to update last_seen timestamp
CREATE OR REPLACE FUNCTION update_device_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE devices
  SET last_seen = NEW.timestamp
  WHERE id = (SELECT device_id FROM sensors WHERE id = NEW.sensor_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_device_last_seen
  AFTER INSERT ON readings
  FOR EACH ROW
  EXECUTE FUNCTION update_device_last_seen();