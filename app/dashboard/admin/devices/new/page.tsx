// app/dashboard/admin/devices/new/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { getBackendUrl } from "@/lib/demo/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertTriangle,
  Settings2,
} from "lucide-react";
import { Device } from "@/types/device"; // Pastikan tipe Device Anda mencerminkan skema DB
import { Alert, AlertDescription } from "@/components/ui/alert";

// Interface HANYA dengan field dari skema DB Anda yang diinput via form
interface NewDeviceData {
  device_id: string;
  location: string;
  description: string;
  sensor_height_cm: string;
  latitude: string;
  longitude: string;
  alert_threshold_percentage: string;
  alert_threshold_absolute_cm: string;
}

export default function AddNewDevicePage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [formData, setFormData] = useState<NewDeviceData>({
    device_id: "",
    location: "",
    description: "",
    sensor_height_cm: "",
    latitude: "",
    longitude: "",
    alert_threshold_percentage: "",
    alert_threshold_absolute_cm: "",
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<NewDeviceData>>({});

  const backendUrl = getBackendUrl();

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated") {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }
    if (sessionStatus === "authenticated" && session.user?.role !== "admin") {
      toast.error("Akses Ditolak", {
        description: "Hanya admin yang dapat menambah perangkat.",
      });
      router.push("/dashboard/all");
    }
  }, [sessionStatus, session, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof NewDeviceData]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<NewDeviceData> = {};
    if (!formData.device_id.trim())
      errors.device_id = "Device ID tidak boleh kosong.";
    else if (formData.device_id.trim().length < 3)
      errors.device_id = "Device ID minimal 3 karakter.";
    else if (/\s/.test(formData.device_id.trim()))
      errors.device_id = "Device ID tidak boleh mengandung spasi.";

    if (formData.sensor_height_cm && !/^\d*$/.test(formData.sensor_height_cm))
      errors.sensor_height_cm = "Tinggi sensor harus angka (integer positif).";
    if (formData.latitude && !/^-?\d*\.?\d*$/.test(formData.latitude))
      errors.latitude =
        "Latitude harus angka desimal (gunakan titik sebagai pemisah).";
    if (formData.longitude && !/^-?\d*\.?\d*$/.test(formData.longitude))
      errors.longitude =
        "Longitude harus angka desimal (gunakan titik sebagai pemisah).";

    if (formData.alert_threshold_percentage) {
      const perc = parseFloat(formData.alert_threshold_percentage);
      if (isNaN(perc) || perc < 0 || perc > 1)
        errors.alert_threshold_percentage =
          "Persentase antara 0.00 dan 1.00 (misal 0.8).";
    }
    if (
      formData.alert_threshold_absolute_cm &&
      !/^\d*$/.test(formData.alert_threshold_absolute_cm)
    )
      errors.alert_threshold_absolute_cm =
        "Ambang batas absolut harus angka (integer positif).";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.warning("Validasi Gagal", {
        description: "Mohon periksa kembali isian form Anda.",
      });
      return;
    }

    if (!session?.user?.backendToken || !backendUrl) {
      toast.error("Error Konfigurasi", {
        description: "Tidak dapat menghubungi server.",
      });
      return;
    }

    setIsSubmitting(true);
    setPageError(null);

    // Payload tidak menyertakan api_key_hash secara eksplisit dari frontend.
    // Backend diharapkan mengatur ini menjadi NULL atau nilai default dari skema database.
    const payload = {
      device_id: formData.device_id.trim(),
      location: formData.location.trim() || null,
      description: formData.description.trim() || null,
      sensor_height_cm: formData.sensor_height_cm
        ? parseInt(formData.sensor_height_cm, 10)
        : null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      alert_threshold_percentage: formData.alert_threshold_percentage
        ? parseFloat(formData.alert_threshold_percentage)
        : null,
      alert_threshold_absolute_cm: formData.alert_threshold_absolute_cm
        ? parseInt(formData.alert_threshold_absolute_cm, 10)
        : null,
    };

    try {
      const response = await fetch(`${backendUrl}/api/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.backendToken}`,
        },
        body: JSON.stringify(payload), // payload tidak mengandung API key
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `Gagal menambah perangkat. Status: ${response.status}`,
        }));
        if (
          response.status === 409 ||
          errorData.message?.toLowerCase().includes("sudah ada") ||
          errorData.message?.toLowerCase().includes("exists") ||
          errorData.message?.toLowerCase().includes("unique constraint")
        ) {
          setFormErrors((prev) => ({
            ...prev,
            device_id: "Device ID ini sudah digunakan atau terdaftar.",
          }));
          const deviceIdInput = document.getElementById("device_id");
          if (deviceIdInput) deviceIdInput.focus();
          throw new Error(
            "Device ID ini sudah digunakan. Mohon gunakan ID lain."
          );
        }
        throw new Error(errorData.message || "Gagal menambah perangkat.");
      }

      // Respons backend TIDAK PERLU LAGI mengirimkan apiKey saat pendaftaran perangkat baru.
      // Tipe respons disesuaikan, hanya mengharapkan objek 'device'.
      const newDeviceResponse: { device: Device } = await response.json();

      toast.success("Perangkat Ditambahkan", {
        description: `Perangkat ID: ${newDeviceResponse.device.device_id} berhasil didaftarkan. Anda dapat meng-generate API Key melalui halaman edit.`,
      });

      // Tidak ada lagi blok 'if (newDeviceResponse.api_key)'
      // karena API key tidak lagi dikirimkan di respons ini.

      router.push("/dashboard/admin/devices");
    } catch (err) {
      console.error("Error adding new device:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Terjadi kesalahan server.";
      // Jangan set pageError jika error sudah ditampilkan di formErrors.device_id
      if (!errorMessage.toLowerCase().includes("device id")) {
        setPageError(errorMessage);
      }
      toast.error("Gagal Menambah Perangkat", { description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionStatus === "loading") {
    return (
      <main className="container mx-auto p-6 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Memuat...</p>
      </main>
    );
  }

  // JSX untuk form tetap sama
  return (
    <main className="container mx-auto px-4 pb-4 pt-2 lg:px-6 lg:pb-6 space-y-6">
      <div className="mb-6">
        <Button
          onClick={() => router.push("/dashboard/admin/devices")}
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Manajemen Perangkat
        </Button>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Settings2 className="mr-3 h-6 w-6 text-primary" />
            Tambah Perangkat IoT Baru
          </CardTitle>
          <CardDescription>
            Isi detail di bawah ini untuk mendaftarkan perangkat baru. Device ID
            wajib diisi.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-4">
            {pageError && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                {/* CardTitle di dalam Alert mungkin tidak standar, bisa disesuaikan */}
                <p className="font-medium">Error Penyimpanan</p>{" "}
                {/* Menggunakan <p> untuk judul error */}
                <AlertDescription className="text-xs">
                  {pageError}
                </AlertDescription>
              </Alert>
            )}
            {/* Baris 1: Device ID */}
            <div className="space-y-1.5">
              <Label htmlFor="device_id">
                Device ID (Unik dan Tanpa Spasi) *
              </Label>
              <Input
                id="device_id"
                name="device_id"
                value={formData.device_id}
                onChange={handleInputChange}
                placeholder="Contoh: SNSR-CKP-001"
                required
                className={formErrors.device_id ? "border-destructive" : ""}
              />
              {formErrors.device_id && (
                <p className="text-xs text-destructive mt-1">
                  {formErrors.device_id}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Identifier unik untuk perangkat ini.
              </p>
            </div>

            {/* Baris Tambahan: Lokasi & Deskripsi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="location">Lokasi</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Contoh: Jembatan Leuwi Gajah"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sensor_height_cm">
                  Tinggi Pemasangan Sensor (cm)
                </Label>
                <Input
                  type="number"
                  id="sensor_height_cm"
                  name="sensor_height_cm"
                  value={formData.sensor_height_cm}
                  onChange={handleInputChange}
                  placeholder="Misal: 300 (dari dasar sungai)"
                  className={
                    formErrors.sensor_height_cm ? "border-destructive" : ""
                  }
                />
                {formErrors.sensor_height_cm && (
                  <p className="text-xs text-destructive mt-1">
                    {formErrors.sensor_height_cm}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Untuk referensi ketinggian air.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  type="text"
                  // pattern="-?\d{1,2}(\.\d{1,7})?" // HTML5 pattern, validasi JS lebih diutamakan
                  id="latitude"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  placeholder="Contoh: -6.8765432"
                  className={formErrors.latitude ? "border-destructive" : ""}
                />
                {formErrors.latitude && (
                  <p className="text-xs text-destructive mt-1">
                    {formErrors.latitude}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  type="text"
                  // pattern="-?\d{1,3}(\.\d{1,7})?" // HTML5 pattern
                  id="longitude"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  placeholder="Contoh: 107.5678901"
                  className={formErrors.longitude ? "border-destructive" : ""}
                />
                {formErrors.longitude && (
                  <p className="text-xs text-destructive mt-1">
                    {formErrors.longitude}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Informasi tambahan tentang perangkat atau area pemantauan."
                rows={3}
              />
            </div>

            <Card className="pt-2">
              <CardHeader className="pb-2 pt-0 px-4">
                <CardTitle className="text-base">
                  Pengaturan Ambang Batas Peringatan
                </CardTitle>
                <CardDescription className="text-xs">
                  Opsional. Kosongkan jika menggunakan default sistem.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 px-4 pb-4">
                <div className="space-y-1.5">
                  <Label htmlFor="alert_threshold_percentage">
                    Persentase Ketinggian Air untuk Alert (0.01 - 1.00)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    id="alert_threshold_percentage"
                    name="alert_threshold_percentage"
                    value={formData.alert_threshold_percentage}
                    onChange={handleInputChange}
                    placeholder="Contoh: 0.8 (untuk 80%)"
                    className={
                      formErrors.alert_threshold_percentage
                        ? "border-destructive"
                        : ""
                    }
                  />
                  {formErrors.alert_threshold_percentage && (
                    <p className="text-xs text-destructive mt-1">
                      {formErrors.alert_threshold_percentage}
                    </p>
                  )}
                </div>
                <div className="space-y-5">
                  <Label htmlFor="alert_threshold_absolute_cm">
                    Ambang Batas Absolut Ketinggian Air (cm)
                  </Label>
                  <Input
                    type="number"
                    id="alert_threshold_absolute_cm"
                    name="alert_threshold_absolute_cm"
                    value={formData.alert_threshold_absolute_cm}
                    onChange={handleInputChange}
                    placeholder="Misal: 250 (cm)"
                    className={
                      formErrors.alert_threshold_absolute_cm
                        ? "border-destructive"
                        : ""
                    }
                  />
                  {formErrors.alert_threshold_absolute_cm && (
                    <p className="text-xs text-destructive mt-1">
                      {formErrors.alert_threshold_absolute_cm}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </CardContent>
          <br />
          <CardFooter className="border-t pt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Daftarkan Perangkat
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
