// lib/demo/mock-socket.ts
// Mock Socket.IO client for demo mode - emits realistic sensor data periodically

import { generateLiveSensorReading, DEMO_DEVICES } from "./data";

type Listener = (...args: unknown[]) => void;

class MockSocket {
  private listeners: Record<string, Listener[]> = {};
  private intervals: ReturnType<typeof setInterval>[] = [];
  public connected = true;
  public id = "demo-socket-id";

  on(event: string, fn: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
    return this;
  }

  off(event: string, fn?: Listener) {
    if (!fn) {
      delete this.listeners[event];
    } else if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((l) => l !== fn);
    }
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    (this.listeners[event] || []).forEach((fn) => fn(...args));
    return this;
  }

  disconnect() {
    this.connected = false;
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    this.listeners = {};
  }

  connect() {
    this.connected = true;
    return this;
  }

  // Start emitting demo events
  startDemoEvents() {
    // Emit new sensor data every 8 seconds for online devices
    const sensorInterval = setInterval(() => {
      DEMO_DEVICES.forEach((device) => {
        if (!device.is_offline) {
          const reading = generateLiveSensorReading(device.device_id);
          this.emit("new_sensor_data", reading);

          // Emit water quality update
          this.emit("water_quality_update", {
            deviceId: device.device_id,
            ph_value: reading.ph_value,
            turbidity_ntu: reading.turbidity_ntu,
            qualityCategory: reading.water_quality_category,
            timestamp: reading.timestamp,
            tds_ppm: reading.tds_ppm,
          });

          // Emit rainfall update
          this.emit("rainfall_update", {
            deviceId: device.device_id,
            rainfall_raw_value: reading.rainfall_value_raw,
            rainfall_category: reading.rainfall_category,
            timestamp: reading.timestamp,
          });
        }
      });
    }, 8000);
    this.intervals.push(sensorInterval);

    // Occasionally emit flood alert (every 45 seconds for device 2 which has high water)
    const alertInterval = setInterval(() => {
      const device = DEMO_DEVICES[1]; // Katulampa - has high water level
      if (Math.random() > 0.5) {
        this.emit("flood_alert", {
          deviceId: device.device_id,
          location: device.location,
          waterLevel_cm: 280 + Math.random() * 30,
          sensorHeight_cm: device.sensor_height_cm,
          thresholdPercentage: device.alert_threshold_percentage,
          criticalLevel_cm: device.alert_threshold_absolute_cm,
          alertType: "percentage_threshold",
          timestamp: new Date().toISOString(),
          serverTimestamp: new Date().toISOString(),
          message: `Peringatan banjir: Ketinggian air di ${device.name} mencapai level siaga!`,
          is_active: true,
          isActive: true,
        });
      }
    }, 45000);
    this.intervals.push(alertInterval);

    // Emit initial connect event
    setTimeout(() => {
      this.emit("connect");
    }, 100);

    return this;
  }
}

let mockSocketInstance: MockSocket | null = null;

export function getDemoSocket(): MockSocket {
  if (!mockSocketInstance || !mockSocketInstance.connected) {
    mockSocketInstance = new MockSocket();
    mockSocketInstance.startDemoEvents();
  }
  return mockSocketInstance;
}

export function disconnectDemoSocket() {
  if (mockSocketInstance) {
    mockSocketInstance.disconnect();
    mockSocketInstance = null;
  }
}
