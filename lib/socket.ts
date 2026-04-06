// lib/socket.ts
import { io, Socket } from "socket.io-client";
import {
  SensorData,
  FloodAlertData,
  RapidRiseAlertData,
  WaterQualityUpdateData,
  CriticalWaterQualityAlertData,
  DeviceStatusUpdateData,
  RainfallUpdateData,
} from "@/types/sensor"; // Impor semua tipe data event yang relevan
import { Device } from "@/types/device"; // Impor tipe Device
import { getDemoSocket } from "@/lib/demo/mock-socket";

// Definisikan tipe untuk event server-ke-klien secara komprehensif
// Ini harus cocok dengan yang Anda gunakan di page.tsx atau tempat lain
export interface ServerToClientEvents {
  new_sensor_data: (data: SensorData) => void;
  flood_alert: (data: FloodAlertData) => void;
  rapid_rise_alert: (data: RapidRiseAlertData) => void;
  rainfall_update: (data: RainfallUpdateData) => void;
  device_updated: (data: Device) => void;
  device_status_update: (data: DeviceStatusUpdateData) => void;
  water_quality_update: (data: WaterQualityUpdateData) => void;
  critical_water_quality_alert: (data: CriticalWaterQualityAlertData) => void;
  // Tambahkan event lain dari server jika ada
}

// Variabel untuk menyimpan instance socket dan URL yang terhubung
let socket: Socket<ServerToClientEvents> | null = null;
let currentConnectedUrl: string | null = null;
let currentToken: string | null | undefined = null;

export const getSocket = (
  url: string,
  token?: string | null
): Socket<ServerToClientEvents> => {
  // Return mock socket in demo mode
  if (typeof window !== "undefined" && localStorage.getItem("sicita_demo_mode") === "true") {
    return getDemoSocket() as unknown as Socket<ServerToClientEvents>;
  }

  // Kondisi untuk re-inisialisasi:
  // 1. Socket belum ada.
  // 2. Socket tidak terkoneksi.
  // 3. URL yang diminta berbeda dengan URL yang sedang terhubung.
  // 4. Token berubah (opsional, tapi seringkali lebih aman untuk re-connect dengan token baru).
  if (
    !socket ||
    !socket.connected ||
    currentConnectedUrl !== url ||
    currentToken !== token // Jika token berubah, anggap perlu koneksi baru
  ) {
    if (socket) {
      console.log(
        "Disconnecting existing socket before creating a new one or reconfiguring..."
      );
      socket.disconnect();
    }

    console.log(`Initializing new socket connection to: ${url}`);
    socket = io(url, {
      auth: {
        // Mengirim token via 'auth' payload
        token: token,
      },
      reconnectionAttempts: 5, // Jumlah percobaan koneksi ulang
      reconnectionDelay: 3000, // Waktu tunda antar percobaan koneksi ulang (ms)
      transports: ["websocket"], // Direkomendasikan untuk konsistensi dan performa
      // Opsi tambahan jika diperlukan
    });

    currentConnectedUrl = url; // Simpan URL dan token yang digunakan untuk koneksi ini
    currentToken = token;

    socket.on("connect", () => {
      console.log(
        "Terhubung ke server Socket.IO:",
        socket?.id,
        "pada URL:",
        currentConnectedUrl
      );
    });

    socket.on("disconnect", (reason: Socket.DisconnectReason) => {
      console.log(
        "Terputus dari server Socket.IO:",
        reason,
        "dari URL:",
        currentConnectedUrl
      );
      // Jika disconnect karena io server atau client, mungkin kita ingin meng-clear instance
      // agar getSocket() berikutnya membuat koneksi baru.
      if (
        reason === "io server disconnect" ||
        reason === "io client disconnect"
      ) {
        // socket = null; // Biarkan reconnection attempts yang menangani, atau logika aplikasi
        // currentConnectedUrl = null;
        // currentToken = null;
      }
    });

    socket.on("connect_error", (error: Error) => {
      console.error(
        `Error koneksi Socket.IO ke ${currentConnectedUrl}:`,
        error.message,
        error.cause // Beberapa error mungkin punya `cause`
      );
      // Di sini juga, bisa di-clear atau biarkan reconnection attempts
    });
  } else {
    // Socket sudah ada, terkoneksi, dan menggunakan URL serta token yang sama.
    // Tidak perlu melakukan apa-apa, atau bisa juga ada logika untuk memastikan auth token
    // di sisi client socket.io object terupdate jika server mendukungnya tanpa reconnect.
    // Namun, untuk perubahan token, umumnya reconnect lebih aman.
    console.log(
      "Menggunakan instance socket yang sudah ada untuk URL:",
      currentConnectedUrl
    );
  }

  return socket;
};

// Fungsi opsional untuk memutuskan koneksi secara eksplisit jika diperlukan
export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
    // Reset variabel agar getSocket() berikutnya membuat koneksi baru
    socket = null;
    currentConnectedUrl = null;
    currentToken = null;
    console.log("Socket.IO diputuskan secara manual.");
  }
};
