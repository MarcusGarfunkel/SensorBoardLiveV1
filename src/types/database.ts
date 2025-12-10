export interface Device {
  id: string;
  user_id: string;
  name: string;
  description: string;
  api_key: string;
  created_at: string;
  last_seen: string;
}

export interface Sensor {
  id: string;
  device_id: string;
  name: string;
  unit: string;
  type: string;
  created_at: string;
}

export interface Reading {
  id: number;
  sensor_id: string;
  value: number;
  timestamp: string;
}

export interface SensorWithLatest extends Sensor {
  latest_reading?: Reading;
}
