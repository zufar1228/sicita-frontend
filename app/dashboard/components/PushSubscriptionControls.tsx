// app/dashboard/components/PushSubscriptionControls.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/hooks/useSession";
import { getBackendUrl } from "@/lib/demo/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  BellRing,
  BellOff,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useDemo } from "@/lib/demo/context";

// Fungsi utilitas
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData =
    typeof window !== "undefined"
      ? window.atob(base64)
      : Buffer.from(base64, "base64").toString("binary"); // Fallback untuk non-browser env
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Definisikan tipe untuk error object yang mungkin memiliki 'message'
interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

export default function PushSubscriptionControls() {
  const { data: session, status: sessionStatus } = useSession();
  const { isDemoMode } = useDemo();
  const [isPushSubscribed, setIsPushSubscribed] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceWorkerReg, setServiceWorkerReg] =
    useState<ServiceWorkerRegistration | null>(null);
  const [notificationPerm, setNotificationPerm] =
    useState<NotificationPermission>("default");

  const apiUrl = getBackendUrl();
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  // Demo mode: check localStorage for simulated subscription state
  useEffect(() => {
    if (isDemoMode) {
      const demoSub = typeof window !== "undefined" && localStorage.getItem("sicita_demo_push_subscribed");
      setIsPushSubscribed(demoSub === "true");
      setNotificationPerm("default");
      setIsProcessing(false);
      return;
    }
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPerm(Notification.permission);
    }

    if (sessionStatus === "authenticated") {
      if ("serviceWorker" in navigator && "PushManager" in window) {
        setIsProcessing(true);
        setError(null);
        navigator.serviceWorker
          .register("/sw.js") // Pastikan sw.js ada di folder public
          .then((swReg) => {
            setServiceWorkerReg(swReg);
            swReg.pushManager
              .getSubscription()
              .then((subscription) => {
                setIsPushSubscribed(!!subscription);
                if (subscription && Notification.permission !== "granted") {
                  subscription
                    .unsubscribe()
                    .then(() => setIsPushSubscribed(false))
                    .catch((err) =>
                      console.error(
                        "Failed to unsubscribe stale subscription",
                        err
                      )
                    );
                }
              })
              .catch((err) => {
                console.error("Error getting push subscription:", err);
                setError("Gagal memeriksa status langganan notifikasi.");
              })
              .finally(() => {
                setIsProcessing(false);
              });
          })
          .catch((err) => {
            console.error("Service Worker registration failed:", err);
            setError("Gagal mendaftarkan Service Worker untuk notifikasi.");
            setIsProcessing(false);
          });
      } else {
        setError("Notifikasi push tidak didukung di browser ini.");
        setIsProcessing(false);
      }
    } else if (sessionStatus === "unauthenticated") {
      setIsProcessing(false);
    }
  }, [sessionStatus]);

  const handleSubscribe = useCallback(async () => {
    // Demo mode: simulate subscription
    if (isDemoMode) {
      setIsProcessing(true);
      setTimeout(() => {
        localStorage.setItem("sicita_demo_push_subscribed", "true");
        setIsPushSubscribed(true);
        setIsProcessing(false);
        toast.success("Berhasil Berlangganan Notifikasi! (Demo)");
      }, 800);
      return;
    }

    if (
      !serviceWorkerReg ||
      sessionStatus !== "authenticated" ||
      !session?.user?.backendToken
    ) {
      setError(
        "Tidak dapat berlangganan: Layanan tidak siap atau sesi tidak valid."
      );
      return;
    }
    if (!vapidPublicKey) {
      setError("Kunci VAPID untuk notifikasi tidak tersedia.");
      toast.error("Konfigurasi Error", {
        description: "Kunci VAPID tidak ditemukan.",
      });
      return;
    }
    if (!apiUrl) {
      setError("URL Backend tidak dikonfigurasi.");
      toast.error("Konfigurasi Error", {
        description: "URL Backend tidak ditemukan.",
      });
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let currentPermission = notificationPerm;
      if (currentPermission === "default") {
        currentPermission = await Notification.requestPermission();
        setNotificationPerm(currentPermission);
      }

      if (currentPermission !== "granted") {
        setError("Izin notifikasi tidak diberikan.");
        toast.info("Izin Dibutuhkan", {
          description: "Anda perlu memberikan izin untuk menerima notifikasi.",
        });
        setIsProcessing(false);
        return;
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await serviceWorkerReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const response = await fetch(`${apiUrl}/api/subscribe`, {
        method: "POST",
        body: JSON.stringify(subscription),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.backendToken}`,
        },
      });

      if (response.ok) {
        toast.success("Berhasil Berlangganan Notifikasi!");
        setIsPushSubscribed(true);
      } else {
        const errorData = await response.json().catch(() => ({
          message: "Gagal mengirim data langganan ke server.",
        }));
        const errorMessage =
          (errorData as ErrorWithMessage).message ||
          "Gagal berlangganan di server.";
        setError(errorMessage);
        toast.error("Gagal Berlangganan", { description: errorMessage });
        if (subscription) {
          await subscription.unsubscribe();
        }
        setIsPushSubscribed(false);
      }
    } catch (err: unknown) {
      // PERBAIKAN BARIS 182
      console.error("Error subscribing to push notifications:", err);
      let message = "Terjadi kesalahan saat mencoba berlangganan.";
      if (isErrorWithMessage(err)) {
        message = err.message;
      } else if (typeof err === "string") {
        message = err;
      }
      setError(message);
      toast.error("Error Berlangganan", { description: message });
      setIsPushSubscribed(false);
    } finally {
      setIsProcessing(false);
    }
  }, [
    serviceWorkerReg,
    apiUrl,
    vapidPublicKey,
    sessionStatus,
    session?.user?.backendToken,
    notificationPerm,
    setNotificationPerm,
    isDemoMode,
  ]);

  const handleUnsubscribe = useCallback(async () => {
    // Demo mode: simulate unsubscription
    if (isDemoMode) {
      setIsProcessing(true);
      setTimeout(() => {
        localStorage.removeItem("sicita_demo_push_subscribed");
        setIsPushSubscribed(false);
        setIsProcessing(false);
        toast.success("Berhasil Berhenti Berlangganan Notifikasi. (Demo)");
      }, 800);
      return;
    }

    if (
      !serviceWorkerReg ||
      !isPushSubscribed ||
      sessionStatus !== "authenticated" ||
      !session?.user?.backendToken
    ) {
      setError("Tidak dapat berhenti berlangganan: Status tidak valid.");
      return;
    }
    if (!apiUrl) {
      setError("URL Backend tidak dikonfigurasi.");
      toast.error("Konfigurasi Error", {
        description: "URL Backend tidak ditemukan.",
      });
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const subscription = await serviceWorkerReg.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch(`${apiUrl}/api/push/unsubscribe`, {
          // Pastikan endpoint unsubscribe benar
          method: "POST",
          body: JSON.stringify({ endpoint: subscription.endpoint }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user.backendToken}`,
          },
        });

        const unsubscribedSuccessfullyOnBrowser =
          await subscription.unsubscribe();

        if (unsubscribedSuccessfullyOnBrowser && response.ok) {
          toast.success("Berhasil Berhenti Berlangganan Notifikasi.");
          setIsPushSubscribed(false);
        } else if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            message: "Gagal berhenti berlangganan di server.",
          }));
          const errorMessage =
            (errorData as ErrorWithMessage).message ||
            "Gagal berhenti berlangganan di server.";
          setError(errorMessage);
          toast.error("Gagal di Server", { description: errorMessage });
          if (unsubscribedSuccessfullyOnBrowser) setIsPushSubscribed(false);
        } else if (!unsubscribedSuccessfullyOnBrowser) {
          setError("Gagal berhenti berlangganan di browser.");
          toast.error("Gagal di Browser", {
            description: "Tidak dapat membatalkan langganan di browser.",
          });
        }
      } else {
        setError("Tidak ditemukan langganan aktif untuk dihentikan.");
        setIsPushSubscribed(false);
      }
    } catch (err: unknown) {
      // PERBAIKAN BARIS 264
      console.error("Error unsubscribing from push notifications:", err);
      let message = "Terjadi kesalahan saat mencoba berhenti berlangganan.";
      if (isErrorWithMessage(err)) {
        message = err.message;
      } else if (typeof err === "string") {
        message = err;
      }
      setError(message);
      toast.error("Error Berhenti Berlangganan", { description: message });
    } finally {
      setIsProcessing(false);
    }
  }, [
    serviceWorkerReg,
    isPushSubscribed,
    apiUrl,
    sessionStatus,
    session?.user?.backendToken,
    isDemoMode,
  ]);

  if (sessionStatus !== "authenticated") {
    return null;
  }

  if (
    isProcessing &&
    !error &&
    notificationPerm !== "denied" &&
    !isPushSubscribed
  ) {
    return (
      <div className="flex items-center justify-center text-sm p-3 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Memuat status notifikasi...
      </div>
    );
  }

  if (!isDemoMode && notificationPerm === "denied") {
    return (
      <Card className=" w-full max-w-sm mx-auto shadow-md border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20">
        <CardHeader className="pb-1 pt-1">
          <CardTitle className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" /> Notifikasi Diblokir
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            Anda telah memblokir izin notifikasi untuk situs ini. Mohon aktifkan
            dari pengaturan browser Anda jika ingin menerima notifikasi.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error && !isPushSubscribed) {
    return (
      <Card className="mb-6 w-full max-w-sm mx-auto shadow-md border-red-500/50 bg-red-50 dark:bg-red-900/20">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-300 flex items-center">
            <XCircle className="h-4 w-4 mr-2" /> Error Notifikasi
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (isPushSubscribed) {
    return (
      <div className="mb-1 w-full max-w-sm mx-auto text-center">
        <p className="text-sm text-green-600 dark:text-green-400 mb-1 flex items-center justify-center">
          <CheckCircle className="h-5 w-5 mr-2" /> Notifikasi push telah
          diaktifkan.
        </p>
        <Button
          onClick={handleUnsubscribe}
          variant="outline"
          size="sm"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <BellOff className="mr-2 h-4 w-4" />
          )}
          Nonaktifkan Notifikasi
        </Button>
      </div>
    );
  }

  return (
    <Card className="mb-6 w-full max-w-sm mx-auto shadow-md">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-base font-semibold">
          Aktifkan Notifikasi Push
        </CardTitle>
        <CardDescription className="text-xs">
          Dapatkan pemberitahuan instan untuk update dan alert penting, bahkan
          saat browser tidak aktif.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <Button
          onClick={handleSubscribe}
          className="w-full"
          size="sm"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <BellRing className="mr-2 h-4 w-4" />
          )}
          Aktifkan Notifikasi
        </Button>
      </CardContent>
    </Card>
  );
}
