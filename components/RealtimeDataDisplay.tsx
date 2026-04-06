"use client";

import { useEffect, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { SensorData, FloodAlertData } from "@/types/sensor";
import { Socket } from "socket.io-client";
import { Button } from "./ui/button";

interface ServerToClientEvents {
  new_sensor_data: (data: SensorData) => void;
  flood_alert: (data: FloodAlertData) => void;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData =
    typeof window !== "undefined"
      ? window.atob(base64)
      : Buffer.from(base64, "base64").toString("binary");
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function RealtimeDataDisplay() {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [floodAlert, setFloodAlert] = useState<FloodAlertData | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isSubscribedToPush, setIsSubscribedToPush] = useState<boolean>(false);
  const [pushSubscriptionError, setPushSubscriptionError] = useState<
    string | null
  >(null);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | null>(null); // State baru

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    } else {
      console.warn(
        "Browser ini tidak mendukung Notification API atau kode tidak berjalan di browser."
      );
    }

    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((swReg) => {
          console.log("Service Worker terdaftar:", swReg);
          setServiceWorkerRegistration(swReg);
          swReg.pushManager.getSubscription().then((subscription) => {
            setIsSubscribedToPush(!!subscription);
          });
        })
        .catch((error) => {
          console.error("Error registrasi Service Worker:", error);
          setPushSubscriptionError(
            "Gagal mendaftarkan Service Worker untuk notifikasi."
          );
        });
    } else {
      if (typeof window !== "undefined") {
        // Hanya tampilkan warning ini di client
        console.warn("Push messaging tidak didukung oleh browser ini.");
        setPushSubscriptionError(
          "Notifikasi Push tidak didukung oleh browser ini."
        );
      }
    }
  }, []);

  const subscribeUserToPush = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !serviceWorkerRegistration
    ) {
      console.error(
        "Prasyarat untuk subscribe push tidak terpenuhi (Notifikasi API, SW, atau registrasi SW)."
      );
      setPushSubscriptionError(
        "Browser tidak mendukung notifikasi atau Service Worker belum siap."
      );
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error(
        "VAPID public key tidak tersedia di environment variables."
      );
      setPushSubscriptionError(
        "Konfigurasi notifikasi tidak lengkap (kunci publik hilang)."
      );
      return;
    }

    try {
      const currentPermission = Notification.permission;
      setNotificationPermission(currentPermission); // Update status terkini sebelum meminta lagi

      let permissionResult = currentPermission;
      if (permissionResult !== "granted") {
        permissionResult = await Notification.requestPermission();
        setNotificationPermission(permissionResult); // Update state dengan hasil terbaru
      }

      if (permissionResult !== "granted") {
        console.log("Izin notifikasi tidak diberikan.");
        setPushSubscriptionError(
          "Anda tidak memberikan izin untuk notifikasi."
        );
        return;
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription =
        await serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey,
        });

      console.log("Berhasil mendapatkan PushSubscription:", subscription);

      const backendUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL; // Ini seharusnya URL backend Anda, misal http://localhost:3000
      if (!backendUrl) {
        console.error(
          "Backend URL (NEXT_PUBLIC_SOCKET_SERVER_URL) tidak diatur."
        );
        setPushSubscriptionError(
          "Konfigurasi klien error: URL backend tidak ditemukan."
        );
        return;
      }

      const response = await fetch(`${backendUrl}/api/subscribe`, {
        method: "POST",
        body: JSON.stringify(subscription),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        console.log("Subscription berhasil dikirim ke server.");
        setIsSubscribedToPush(true);
        setPushSubscriptionError(null);
      } else {
        const errorData = await response.json();
        console.error(
          "Gagal mengirim subscription ke server:",
          response.status,
          errorData
        );
        setPushSubscriptionError(
          `Gagal menyimpan langganan di server: ${
            errorData.error || response.statusText
          }`
        );
        if (subscription) {
          subscription
            .unsubscribe()
            .then(() =>
              console.log("Unsubscribed due to server save failure.")
            );
        }
      }
    } catch (error) {
      console.error("Error selama proses berlangganan push:", error);
      if (error instanceof Error && error.name === "AbortError") {
        setPushSubscriptionError("Proses berlangganan notifikasi dibatalkan.");
      } else if (error instanceof Error && error.name === "NotAllowedError") {
        setPushSubscriptionError(
          "Izin notifikasi tidak diberikan atau diblokir."
        );
      } else {
        setPushSubscriptionError(
          `Error berlangganan notifikasi: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      setIsSubscribedToPush(false);
    }
  }, [serviceWorkerRegistration]);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
    if (!backendUrl) {
      console.error(
        "Socket server URL (NEXT_PUBLIC_SOCKET_SERVER_URL) is not defined. Cannot initialize socket."
      );
      // Optionally, set an error state here to inform the user on the UI
      return;
    }

    const currentSocket: Socket<ServerToClientEvents> = getSocket(backendUrl);
    if (currentSocket.connected) setIsConnected(true);

    const handleConnect = () => {
      setIsConnected(true);
    };
    const handleDisconnect = () => {
      setIsConnected(false);
      setFloodAlert(null);
    };
    const handleNewSensorData = (data: SensorData) => {
      setSensorData(data);
    };
    const handleFloodAlert = (data: FloodAlertData) => {
      setFloodAlert(data);
    };

    if (!currentSocket.connected) currentSocket.connect();

    currentSocket.on("connect", handleConnect);
    currentSocket.on("disconnect", handleDisconnect);
    currentSocket.on("new_sensor_data", handleNewSensorData);
    currentSocket.on("flood_alert", handleFloodAlert);

    return () => {
      currentSocket.off("connect", handleConnect);
      currentSocket.off("disconnect", handleDisconnect);
      currentSocket.off("new_sensor_data", handleNewSensorData);
      currentSocket.off("flood_alert", handleFloodAlert);
    };
  }, []);

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white dark:bg-gray-800">
      <div className="mb-4 p-3 border rounded-md dark:border-gray-700">
        <h3 className="text-md font-semibold mb-2 text-gray-800 dark:text-white">
          Notifikasi Push
        </h3>
        {/* Cek notificationPermission sebelum render tombol */}
        {notificationPermission !== null &&
          !isSubscribedToPush &&
          notificationPermission !== "denied" && (
            <Button
              onClick={subscribeUserToPush}
              disabled={!serviceWorkerRegistration}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 dark:bg-blue-600 dark:hover:bg-blue-700 dark:disabled:bg-gray-600"
            >
              Aktifkan Notifikasi Peringatan
            </Button>
          )}
        {isSubscribedToPush && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Anda sudah berlangganan notifikasi.
          </p>
        )}
        {notificationPermission === "denied" && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            Notifikasi diblokir. Harap aktifkan dari pengaturan browser Anda.
          </p>
        )}
        {pushSubscriptionError && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            {pushSubscriptionError}
          </p>
        )}
      </div>

      {floodAlert && (
        <div
          className="mb-4 p-3 rounded-md bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200 dark:border-red-700"
          role="alert"
        >
          <h3 className="font-bold text-lg">PERINGATAN BANJIR!</h3>
          <p className="text-sm">{floodAlert.message}</p>
          <p className="text-xs mt-1">
            Device: {floodAlert.deviceId}{" "}
            {floodAlert.location ? `(${floodAlert.location})` : ""}| Ketinggian
            Air: {floodAlert.waterLevel_cm}cm | Terdeteksi:{" "}
            {new Date(floodAlert.serverTimestamp).toLocaleString()}
          </p>
          <button
            onClick={() => setFloodAlert(null)}
            className="mt-2 text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800"
          >
            Tutup Peringatan
          </button>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">
        Data Sensor Real-time{" "}
        <span
          className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
            isConnected
              ? "bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100"
              : "bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100"
          }`}
        >
          {isConnected ? "Terhubung" : "Terputus"}
        </span>
      </h2>
      {sensorData ? (
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <p>
            <strong>Device ID:</strong> {sensorData.device_id}
          </p>
          <p>
            <strong>Timestamp:</strong>{" "}
            {new Date(sensorData.timestamp).toLocaleString()}
          </p>
          <p>
            <strong>Ketinggian Air:</strong>{" "}
            {sensorData.water_level_cm ?? "N/A"} cm
          </p>
          <p>
            <strong>Suhu:</strong> {sensorData.temperature_c ?? "N/A"} °C
          </p>
          <p>
            <strong>TDS:</strong> {sensorData.tds_ppm ?? "N/A"} ppm
          </p>
          <p>
            <strong>Kekeruhan:</strong> {sensorData.turbidity_ntu ?? "N/A"} NTU
          </p>
          <p>
            <strong>pH:</strong> {sensorData.ph_value ?? "N/A"}
          </p>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">
          Menunggu data sensor terbaru...
        </p>
      )}
      <details className="mt-4 text-xs">
        <summary className="cursor-pointer text-gray-600 dark:text-gray-400">
          Lihat Data Mentah Sensor
        </summary>
        <pre className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300 overflow-auto">
          {JSON.stringify(sensorData, null, 2) || "Tidak ada data mentah"}
        </pre>
      </details>
      {floodAlert && (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer text-gray-600 dark:text-gray-400">
            Lihat Data Mentah Alert
          </summary>
          <pre className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300 overflow-auto">
            {JSON.stringify(floodAlert, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
