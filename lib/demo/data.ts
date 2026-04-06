// lib/demo/data.ts
// Comprehensive mock data for demo mode

import { Device } from "@/types/device";
import { SensorData } from "@/types/sensor";

// --- Demo Devices ---
export const DEMO_DEVICES: Device[] = [
  {
    device_id: "demo-device-001",
    name: "Sensor Sungai Ciliwung - Depok",
    location: "Jembatan Panus, Depok",
    description: "Sensor monitoring ketinggian air dan kualitas air sungai Ciliwung area Depok",
    sensor_height_cm: 300,
    alert_threshold_percentage: 0.8,
    alert_threshold_absolute_cm: 240,
    api_key_hash: null,
    is_offline: false,
    isOffline: false,
    latitude: -6.3923,
    longitude: 106.8244,
    created_at: "2025-01-15T08:00:00.000Z",
    updated_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    api_key_updated_at: "2025-01-15T08:00:00.000Z",
    latest_reading: {
      device_id: "demo-device-001",
      timestamp: new Date().toISOString(),
      water_level_cm: 145,
      raw_distance_cm: 155,
      tds_ppm: 320,
      turbidity_ntu: 15.2,
      ph_value: 7.1,
      temperature_c: 27.5,
      rainfall_value_raw: 30,
      rainfall_category: "Tidak Hujan",
      water_quality_category: "Baik",
    },
  },
  {
    device_id: "demo-device-002",
    name: "Sensor Sungai Cisadane - Bogor",
    location: "Bendungan Katulampa, Bogor",
    description: "Sensor monitoring banjir di area Katulampa Bogor",
    sensor_height_cm: 400,
    alert_threshold_percentage: 0.75,
    alert_threshold_absolute_cm: 300,
    api_key_hash: null,
    is_offline: false,
    isOffline: false,
    latitude: -6.6340,
    longitude: 106.8516,
    created_at: "2025-02-20T10:00:00.000Z",
    updated_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    api_key_updated_at: "2025-02-20T10:00:00.000Z",
    latest_reading: {
      device_id: "demo-device-002",
      timestamp: new Date().toISOString(),
      water_level_cm: 280,
      raw_distance_cm: 120,
      tds_ppm: 450,
      turbidity_ntu: 35.8,
      ph_value: 6.8,
      temperature_c: 26.3,
      rainfall_value_raw: 1200,
      rainfall_category: "Sedang",
      water_quality_category: "Sedang",
    },
  },
  {
    device_id: "demo-device-003",
    name: "Sensor Sungai Citarum - Bandung",
    location: "Dayeuhkolot, Bandung",
    description: "Sensor monitoring kualitas air sungai Citarum",
    sensor_height_cm: 350,
    alert_threshold_percentage: 0.85,
    alert_threshold_absolute_cm: 297,
    api_key_hash: null,
    is_offline: true,
    isOffline: true,
    latitude: -6.9867,
    longitude: 107.6182,
    created_at: "2025-03-10T14:00:00.000Z",
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    last_seen_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    api_key_updated_at: "2025-03-10T14:00:00.000Z",
    latest_reading: {
      device_id: "demo-device-003",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      water_level_cm: 95,
      raw_distance_cm: 255,
      tds_ppm: 680,
      turbidity_ntu: 52.3,
      ph_value: 5.9,
      temperature_c: 25.1,
      rainfall_value_raw: 0,
      rainfall_category: "Tidak Hujan",
      water_quality_category: "Buruk",
    },
  },
];

// --- Demo Users ---
export const DEMO_USERS = [
  {
    id: 1,
    username: "admin_demo",
    email: "admin@sicita-demo.id",
    role: "admin",
    is_active: true,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    username: "operator_bandung",
    email: "operator.bdg@sicita-demo.id",
    role: "user",
    is_active: true,
    created_at: "2025-02-14T08:30:00.000Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    username: "operator_depok",
    email: "operator.dpk@sicita-demo.id",
    role: "user",
    is_active: true,
    created_at: "2025-03-01T10:00:00.000Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    username: "viewer_bogor",
    email: "viewer.bgr@sicita-demo.id",
    role: "user",
    is_active: false,
    created_at: "2025-04-10T12:00:00.000Z",
    updated_at: new Date().toISOString(),
  },
];

// --- Demo Alerts ---
export function generateDemoAlerts(count: number = 25) {
  const alertTypes = ["flood", "rapid_rise", "critical_water_quality"];
  const severities = ["warning", "critical", "info"];
  const statuses = ["active", "resolved"];
  const devices = DEMO_DEVICES;
  const alerts = [];

  for (let i = 0; i < count; i++) {
    const device = devices[i % devices.length];
    const alertType = alertTypes[i % alertTypes.length];
    const daysAgo = Math.floor(i * 1.5);
    const timestamp = new Date(Date.now() - daysAgo * 86400000).toISOString();

    alerts.push({
      id: i + 1,
      device_id: device.device_id,
      device_name: device.name,
      device_location: device.location,
      alert_type: alertType,
      severity: severities[i % severities.length],
      status: i < 3 ? "active" : statuses[Math.floor(Math.random() * 2)],
      message: getAlertMessage(alertType, device.name || device.device_id),
      water_level_cm: 100 + Math.random() * 200,
      threshold_cm: device.alert_threshold_absolute_cm,
      created_at: timestamp,
      updated_at: timestamp,
      resolved_at: i >= 3 ? new Date(Date.now() - (daysAgo - 0.5) * 86400000).toISOString() : null,
    });
  }
  return alerts;
}

function getAlertMessage(type: string, deviceName: string): string {
  switch (type) {
    case "flood":
      return `Peringatan banjir: Ketinggian air di ${deviceName} telah melampaui ambang batas!`;
    case "rapid_rise":
      return `Kenaikan cepat terdeteksi di ${deviceName}: Level air naik signifikan dalam waktu singkat.`;
    case "critical_water_quality":
      return `Kualitas air kritis di ${deviceName}: Parameter pH/turbidity melampaui batas aman.`;
    default:
      return `Alert pada ${deviceName}`;
  }
}

// --- Generate Sensor History Data ---
export function generateSensorHistory(
  deviceId: string,
  hoursBack: number = 48
): SensorData[] {
  const data: SensorData[] = [];
  const device = DEMO_DEVICES.find((d) => d.device_id === deviceId) || DEMO_DEVICES[0];
  const baseWaterLevel = device.latest_reading?.water_level_cm || 120;
  const now = Date.now();

  for (let i = hoursBack * 6; i >= 0; i--) {
    // Every 10 minutes
    const timestamp = new Date(now - i * 10 * 60000).toISOString();
    const hourOfDay = new Date(now - i * 10 * 60000).getHours();

    // Simulate daily pattern: higher at night (rain), lower at noon
    const dailyVariation = Math.sin(((hourOfDay - 6) / 24) * Math.PI * 2) * 20;
    const noise = (Math.random() - 0.5) * 10;
    const waterLevel = Math.max(20, Math.min(baseWaterLevel + dailyVariation + noise, (device.sensor_height_cm || 300) - 10));

    const rainfallRaw = hourOfDay >= 15 && hourOfDay <= 20
      ? Math.random() * 2500
      : Math.random() * 100;

    data.push({
      device_id: deviceId,
      timestamp,
      water_level_cm: Math.round(waterLevel * 10) / 10,
      raw_distance_cm: Math.round(((device.sensor_height_cm || 300) - waterLevel) * 10) / 10,
      tds_ppm: Math.round(250 + Math.random() * 400),
      turbidity_ntu: Math.round((10 + Math.random() * 50) * 10) / 10,
      ph_value: Math.round((6.0 + Math.random() * 2.5) * 10) / 10,
      temperature_c: Math.round((24 + Math.random() * 6) * 10) / 10,
      rainfall_value_raw: Math.round(rainfallRaw),
      rainfall_category: getRainfallCategory(rainfallRaw),
      water_quality_category: getWaterQualityCategory(
        6.0 + Math.random() * 2.5,
        10 + Math.random() * 50
      ),
    });
  }
  return data;
}

function getRainfallCategory(raw: number): string {
  if (raw <= 50) return "Tidak Hujan";
  if (raw <= 1000) return "Ringan";
  if (raw <= 2500) return "Sedang";
  return "Lebat";
}

function getWaterQualityCategory(ph: number, turbidity: number): string {
  if (ph >= 6.5 && ph <= 8.5 && turbidity < 25) return "Baik";
  if (ph >= 6.0 && ph <= 9.0 && turbidity < 50) return "Sedang";
  if (turbidity >= 75 || ph < 5.5 || ph > 9.5) return "Kritis";
  return "Buruk";
}

// --- Generate a single fluctuating sensor reading ---
export function generateLiveSensorReading(deviceId: string): SensorData {
  const device = DEMO_DEVICES.find((d) => d.device_id === deviceId);
  const baseLevel = device?.latest_reading?.water_level_cm || 120;
  const sensorHeight = device?.sensor_height_cm || 300;
  const waterLevel = Math.max(
    20,
    Math.min(baseLevel + (Math.random() - 0.5) * 8, sensorHeight - 10)
  );
  const rainfallRaw = Math.random() * 1500;

  return {
    device_id: deviceId,
    timestamp: new Date().toISOString(),
    water_level_cm: Math.round(waterLevel * 10) / 10,
    raw_distance_cm: Math.round((sensorHeight - waterLevel) * 10) / 10,
    tds_ppm: Math.round(250 + Math.random() * 400),
    turbidity_ntu: Math.round((10 + Math.random() * 50) * 10) / 10,
    ph_value: Math.round((6.0 + Math.random() * 2.5) * 10) / 10,
    temperature_c: Math.round((24 + Math.random() * 6) * 10) / 10,
    rainfall_value_raw: Math.round(rainfallRaw),
    rainfall_category: getRainfallCategory(rainfallRaw),
    water_quality_category: getWaterQualityCategory(
      6.0 + Math.random() * 2.5,
      10 + Math.random() * 50
    ),
  };
}

// --- Demo Session ---
export const DEMO_SESSION = {
  user: {
    id: "1",
    name: "admin_demo",
    username: "admin_demo",
    email: "admin@sicita-demo.id",
    image: null,
    role: "admin" as const,
    backendToken: "demo-token-not-real",
    provider: "credentials" as const,
  },
  expires: new Date(Date.now() + 86400000 * 365).toISOString(), // 1 year from now
};

// --- Notification preferences ---
export const DEMO_NOTIFICATION_PREFERENCES = {
  deviceIds: DEMO_DEVICES.map((d) => d.device_id),
};
