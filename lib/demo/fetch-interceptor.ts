// lib/demo/fetch-interceptor.ts
// Intercepts fetch calls to backend API in demo mode and returns mock data

import {
  DEMO_DEVICES,
  DEMO_USERS,
  DEMO_NOTIFICATION_PREFERENCES,
  generateDemoAlerts,
  generateSensorHistory,
} from "./data";

// Parse URL path and return mock response
function handleDemoRequest(url: string, options?: RequestInit): Response | null {
  let pathname: string;
  try {
    const parsed = new URL(url);
    pathname = parsed.pathname;
    const searchParams = parsed.searchParams;

    // GET /api/devices
    if (pathname === "/api/devices" && (!options?.method || options.method === "GET")) {
      return jsonResponse(DEMO_DEVICES);
    }

    // GET /api/devices/:id
    const deviceMatch = pathname.match(/^\/api\/devices\/(.+)$/);
    if (deviceMatch && (!options?.method || options.method === "GET")) {
      const device = DEMO_DEVICES.find((d) => d.device_id === deviceMatch[1]);
      return device ? jsonResponse(device) : jsonResponse({ message: "Device not found" }, 404);
    }

    // POST /api/devices (create)
    if (pathname === "/api/devices" && options?.method === "POST") {
      const body = JSON.parse(options.body as string || "{}");
      return jsonResponse({
        ...body,
        device_id: `demo-device-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, 201);
    }

    // PUT /api/devices/:id
    if (deviceMatch && options?.method === "PUT") {
      const body = JSON.parse(options.body as string || "{}");
      const device = DEMO_DEVICES.find((d) => d.device_id === deviceMatch[1]);
      return jsonResponse({ ...device, ...body, updated_at: new Date().toISOString() });
    }

    // DELETE /api/devices/:id
    if (deviceMatch && options?.method === "DELETE") {
      return jsonResponse({ message: "Device deleted successfully" });
    }

    // GET /api/alerts or /api/alerts/:deviceId
    if (pathname.startsWith("/api/alerts")) {
      const limit = parseInt(searchParams.get("limit") || "25");
      const page = parseInt(searchParams.get("page") || "1");
      const alerts = generateDemoAlerts(50);
      const start = (page - 1) * limit;
      const paginatedAlerts = alerts.slice(start, start + limit);
      return jsonResponse({
        data: paginatedAlerts,
        total: alerts.length,
        page,
        limit,
        totalPages: Math.ceil(alerts.length / limit),
      });
    }

    // GET /api/sensor-data
    if (pathname === "/api/sensor-data" || pathname.startsWith("/api/sensor-data")) {
      const deviceId = searchParams.get("deviceId") || searchParams.get("device_id") || DEMO_DEVICES[0].device_id;
      const history = generateSensorHistory(deviceId, 48);
      return jsonResponse({
        data: history,
        total: history.length,
      });
    }

    // GET /api/users
    if (pathname === "/api/users" && (!options?.method || options.method === "GET")) {
      return jsonResponse(DEMO_USERS);
    }

    // POST /api/users/admin-create
    if (pathname === "/api/users/admin-create" && options?.method === "POST") {
      const body = JSON.parse(options.body as string || "{}");
      return jsonResponse({
        id: Date.now(),
        ...body,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, 201);
    }

    // GET/PUT /api/users/me/profile
    if (pathname === "/api/users/me/profile") {
      if (!options?.method || options.method === "GET") {
        return jsonResponse(DEMO_USERS[0]);
      }
      if (options?.method === "PUT") {
        const body = JSON.parse(options.body as string || "{}");
        return jsonResponse({ ...DEMO_USERS[0], ...body, updated_at: new Date().toISOString() });
      }
    }

    // POST /api/users/me/change-password
    if (pathname === "/api/users/me/change-password" && options?.method === "POST") {
      return jsonResponse({ success: true, message: "Password changed successfully (demo)" });
    }

    // PUT /api/users/:id/approve
    const approveMatch = pathname.match(/^\/api\/users\/(\d+)\/approve$/);
    if (approveMatch && options?.method === "PUT") {
      const user = DEMO_USERS.find((u) => u.id === parseInt(approveMatch[1]));
      return jsonResponse({ ...user, is_active: true, updated_at: new Date().toISOString() });
    }

    // GET /api/users/:id
    const userMatch = pathname.match(/^\/api\/users\/(\d+)$/);
    if (userMatch && (!options?.method || options.method === "GET")) {
      const user = DEMO_USERS.find((u) => u.id === parseInt(userMatch[1]));
      return user ? jsonResponse(user) : jsonResponse({ message: "User not found" }, 404);
    }

    // PUT /api/users/:id
    if (userMatch && options?.method === "PUT") {
      const body = JSON.parse(options.body as string || "{}");
      const user = DEMO_USERS.find((u) => u.id === parseInt(userMatch[1]));
      return jsonResponse({ ...user, ...body, updated_at: new Date().toISOString() });
    }

    // DELETE /api/users/:id
    if (userMatch && options?.method === "DELETE") {
      return jsonResponse({ message: "User deleted successfully" });
    }

    // POST /api/users/:id/change-password
    const pwMatch = pathname.match(/^\/api\/users\/(\d+)\/change-password$/);
    if (pwMatch && options?.method === "POST") {
      return jsonResponse({ success: true, message: "Password changed successfully (demo)" });
    }

    // POST /api/users (create)
    if (pathname === "/api/users" && options?.method === "POST") {
      const body = JSON.parse(options.body as string || "{}");
      return jsonResponse({
        id: Date.now(),
        ...body,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, 201);
    }

    // GET /api/notification-preferences
    if (pathname.includes("/notification-preferences") || pathname.includes("/notification")) {
      if (!options?.method || options.method === "GET") {
        return jsonResponse(DEMO_NOTIFICATION_PREFERENCES);
      }
      // POST/PUT notification preferences
      return jsonResponse({ success: true });
    }

    // Push subscription endpoints
    if (pathname.includes("/push-subscription") || pathname.includes("/subscribe") || pathname.includes("/push/unsubscribe")) {
      return jsonResponse({ success: true });
    }

    // Auth endpoints (shouldn't be reached but just in case)
    if (pathname.includes("/api/auth")) {
      return null; // Let NextAuth handle its own routes
    }

  } catch {
    // If URL parsing fails, return null to let the original fetch handle it
    return null;
  }

  return null; // Unknown endpoint, let original fetch handle it
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Install/uninstall the fetch interceptor
let originalFetch: typeof window.fetch | null = null;

export function installDemoFetchInterceptor() {
  if (typeof window === "undefined") return;
  if (originalFetch) return; // Already installed

  originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;

    // Only intercept backend API calls (not NextAuth, not local assets)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "";
    const isBackendCall = (backendUrl && url.startsWith(backendUrl)) || url.includes("/api/devices") || url.includes("/api/alerts") || url.includes("/api/sensor-data") || url.includes("/api/users") || url.includes("/api/notification");

    // Don't intercept NextAuth routes
    const isNextAuthCall = url.includes("/api/auth/");

    if (isBackendCall && !isNextAuthCall) {
      const mockResponse = handleDemoRequest(url, init);
      if (mockResponse) {
        return mockResponse;
      }
    }

    // Fall through to real fetch for non-backend calls (NextAuth, assets, etc.)
    return originalFetch!(input, init);
  };
}

export function uninstallDemoFetchInterceptor() {
  if (typeof window === "undefined") return;
  if (originalFetch) {
    window.fetch = originalFetch;
    originalFetch = null;
  }
}
