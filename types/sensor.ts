// types/sensor.ts
export interface SensorData {
  device_id: string;
  timestamp: string; // ISO 8601 date string
  water_level_cm?: number | null; // Opsional dan bisa null
  raw_distance_cm?: number | null;
  tds_ppm?: number | null;
  turbidity_ntu?: number | null;
  ph_value?: number | null;
  temperature_c?: number | null;
  rainfall_value_raw?: number | null;
  rainfall_category?: string | null;
  water_quality_category?: string | null;
  last_updated_at?: string;
}

export interface FloodAlertData {
  deviceId: string;
  location?: string | null; // Lokasi bisa null
  waterLevel_cm: number;
  sensorHeight_cm?: number | null; // Bisa null
  thresholdPercentage?: number | null; // Bisa null
  criticalLevel_cm?: number | null; // Bisa null
  alertType: string; // "percentage_threshold" atau "absolute_threshold"
  timestamp: string; // Timestamp dari data sensor
  serverTimestamp: string; // Timestamp saat server mendeteksi alert
  message: string;
  is_active?: boolean; // Untuk menandai apakah alert ini aktif
  isActive?: boolean; // Untuk menandai apakah alert ini aktif
  thresholdCm?: number | null; // Untuk absolute threshold
  waterLevelCm?: number | null; // Untuk absolute threshold
}

export interface RapidRiseAlertData {
  deviceId: string;
  message: string;
  currentWaterLevel_cm: number;
  previousWaterLevel_cm: number;
  rateOfChange_cm_per_minute: number;
  checkInterval_seconds: number;
  timestamp: string; // Timestamp dari data sensor terbaru yang memicu ini
  isActive?: boolean; // Untuk menandai apakah alert ini aktif
  riseCm?: number; // Jumlah kenaikan air yang terdeteksi
  periodMinutes?: number; // Periode waktu dalam menit untuk kenaikan ini
}

export interface WaterQualityUpdateData {
  // Untuk event 'water_quality_update'
  deviceId: string;
  ph_value: number | null;
  turbidity_ntu: number | null;
  qualityCategory: string; // "Baik", "Sedang", "Buruk", "Kritis", "Data Tidak Lengkap"
  timestamp: string; // Timestamp dari data sensor
  tds_ppm?: number | null; // Nilai TDS jika ada
}

// Untuk event 'critical_water_quality_alert'
// Payload ini dikirim dari backend dan juga digunakan untuk membangun notifikasi push
export interface CriticalWaterQualityAlertData {
  deviceId: string;
  deviceName?: string; // Idealnya ada ini
  deviceLocation?: string; // Idealnya ada ini
  message: string; // Pesan utama alert
  critical_parameter?: string; // Parameter apa yang kritis
  value?: string | number; // Nilai parameter
  timestamp: string;
  ph_value: number | null;
  turbidity_ntu: number | null;
  qualityCategory: string;
  title?: string;
  body?: string; // Bisa jadi ringkasan dari message
  icon?: string;
  data?: { url?: string }; // Untuk aksi klik notifikasi
  location?: string | null; // Bisa ditambahkan jika backend mengirimkannya
  serverTimestamp?: string; // Waktu server mendeteksi alert
  tds_ppm?: number | null; // Nilai TDS jika ada
  is_active?: boolean; // Untuk menandai apakah alert ini aktif
  isActive?: boolean; // Untuk menandai apakah alert ini aktif
}

// types/sensor.ts
export interface RainfallUpdateData {
  deviceId: string;
  rainfall_raw_value?: number | null;
  rainfall_category: string; // Misal: "Tidak Hujan", "Ringan", "Sedang", "Lebat"
  timestamp: string;
}

export interface DeviceStatusUpdateData {
  deviceId: string;
  is_offline: boolean; // Sesuaikan dengan field di backend
  location?: string | null;
  name?: string | null; // Jika nama bisa diupdate via socket
  last_seen_at?: string | null; // Sesuaikan dengan field di backend
  isOffline?: boolean; // Untuk menandai apakah perangkat offline
}
