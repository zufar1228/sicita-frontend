import { SensorData } from "./sensor";

// types/device.ts
export interface Device {
  name?: string | null;
  device_id: string;
  location?: string | null;
  description?: string | null;
  sensor_height_cm?: number | null;
  alert_threshold_percentage?: number | null; // Misalnya 0.80 untuk 80%
  alert_threshold_absolute_cm?: number | null;
  api_key_hash?: string | null;
  isOffline?: boolean;
  is_offline?: boolean;
  latitude?: number | null; // Dari skema awal
  longitude?: number | null; // Dari skema awal
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  latest_reading?: SensorData | null;
  last_seen_at?: string | null;
  api_key_updated_at: string | null;
}
