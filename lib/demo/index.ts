// lib/demo/index.ts
export { DemoProvider, useDemo } from "./context";
export { getDemoSocket, disconnectDemoSocket } from "./mock-socket";
export { installDemoFetchInterceptor, uninstallDemoFetchInterceptor } from "./fetch-interceptor";
export {
  DEMO_DEVICES,
  DEMO_USERS,
  DEMO_SESSION,
  DEMO_NOTIFICATION_PREFERENCES,
  generateDemoAlerts,
  generateSensorHistory,
  generateLiveSensorReading,
} from "./data";
