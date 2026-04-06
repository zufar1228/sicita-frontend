// lib/demo/utils.ts
// Utility to get backend URL with demo mode fallback

const DEMO_KEY = "sicita_demo_mode";

export function getBackendUrl(): string | undefined {
  const url =
    process.env.NEXT_PUBLIC_BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
  if (url) return url;
  if (
    typeof window !== "undefined" &&
    localStorage.getItem(DEMO_KEY) === "true"
  ) {
    return "https://demo.local";
  }
  return undefined;
}
