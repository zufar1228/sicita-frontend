// app/dashboard/admin/devices/edit/[deviceId]/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { getBackendUrl } from "@/lib/demo/utils";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Device } from "@/types/device";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Save,
  KeyRound,
  Copy,
  Loader2,
  AlertTriangle,
  Settings2,
  Info,
  CheckCircle,
} from "lucide-react";
import { Label } from "@/components/ui/label";

const deviceFormSchema = z.object({
  location: z.string().max(255).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  sensor_height_cm: z.preprocess(
    (val) =>
      val === "" || val === null || val === undefined ? null : Number(val),
    z
      .number()
      .positive("Tinggi sensor harus angka positif.")
      .int("Tinggi sensor harus bilangan bulat.")
      .nullable()
      .optional()
  ),
  latitude: z.preprocess(
    (val) =>
      val === "" || val === null || val === undefined ? null : Number(val),
    z
      .number()
      .min(-90, "Latitude minimal -90")
      .max(90, "Latitude maksimal 90")
      .nullable()
      .optional()
  ),
  longitude: z.preprocess(
    (val) =>
      val === "" || val === null || val === undefined ? null : Number(val),
    z
      .number()
      .min(-180, "Longitude minimal -180")
      .max(180, "Longitude maksimal 180")
      .nullable()
      .optional()
  ),
  alert_threshold_percentage: z.preprocess(
    (val) =>
      val === "" || val === null || val === undefined ? null : Number(val),
    z
      .number()
      .min(0, "Persentase min 0")
      .max(1, "Persentase maks 1 (misal 0.8 untuk 80%)")
      .nullable()
      .optional()
  ),
  alert_threshold_absolute_cm: z.preprocess(
    (val) =>
      val === "" || val === null || val === undefined ? null : Number(val),
    z
      .number()
      .positive("Threshold absolut harus angka positif.")
      .int("Threshold absolut harus bilangan bulat.")
      .nullable()
      .optional()
  ),
});

type DeviceFormData = z.infer<typeof deviceFormSchema>;

interface BackendErrorResponse {
  message?: string;
  [key: string]: unknown;
}

export default function EditDevicePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const deviceId = params?.deviceId as string | undefined;

  const [device, setDevice] = useState<Device | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [isGeneratingApiKey, setIsGeneratingApiKey] = useState<boolean>(false);
  const [apiKeyCopied, setApiKeyCopied] = useState<boolean>(false);

  const backendUrl = getBackendUrl();

  const form = useForm<DeviceFormData>({
    resolver: zodResolver(deviceFormSchema) as Resolver<DeviceFormData>,
    defaultValues: {
      location: "",
      description: "",
      sensor_height_cm: null,
      latitude: null,
      longitude: null,
      alert_threshold_percentage: null,
      alert_threshold_absolute_cm: null,
    },
  });

  const fetchData = useCallback(async () => {
    if (
      !deviceId ||
      sessionStatus !== "authenticated" ||
      !session?.user?.backendToken ||
      !backendUrl
    ) {
      setIsLoading(false);
      if (sessionStatus === "authenticated" && !deviceId)
        setPageError("Device ID tidak valid.");
      return;
    }
    setIsLoading(true);
    setPageError(null);
    try {
      const response = await fetch(`${backendUrl}/api/devices/${deviceId}`, {
        headers: { Authorization: `Bearer ${session.user.backendToken}` },
      });
      if (!response.ok) {
        const errData: BackendErrorResponse = await response
          .json()
          .catch(() => ({}));
        throw new Error(
          errData.message ||
            `Gagal mengambil detail perangkat: ${response.statusText} (${response.status})`
        );
      }
      const data: Device = await response.json();
      setDevice(data);
      form.reset({
        location: data.location ?? "",
        description: data.description ?? "",
        sensor_height_cm: data.sensor_height_cm,
        latitude: data.latitude,
        longitude: data.longitude,
        alert_threshold_percentage: data.alert_threshold_percentage,
        alert_threshold_absolute_cm: data.alert_threshold_absolute_cm,
      });
    } catch (err) {
      console.error("Error fetching device details:", err);
      setPageError(
        err instanceof Error ? err.message : "Terjadi kesalahan tidak diketahui"
      );
    } finally {
      setIsLoading(false);
    }
  }, [deviceId, backendUrl, form, sessionStatus, session]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated") {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }
    if (sessionStatus === "authenticated" && session.user?.role !== "admin") {
      setPageError("Akses ditolak: Anda tidak memiliki izin admin.");
      setIsLoading(false);
      return;
    }
    if (
      sessionStatus === "authenticated" &&
      session.user?.role === "admin" &&
      deviceId
    ) {
      fetchData();
    }
  }, [sessionStatus, session, router, deviceId, fetchData]);

  const onSubmit = async (formDataValues: DeviceFormData) => {
    if (!deviceId || !backendUrl || !session?.user?.backendToken) {
      toast.error("Error", {
        description: "Konfigurasi tidak lengkap atau sesi tidak valid.",
      });
      return;
    }
    setIsSubmitting(true);

    const payload: Partial<DeviceFormData> = {};
    (Object.keys(formDataValues) as Array<keyof DeviceFormData>).forEach(
      (key) => {
        const formValue = formDataValues[key];
        const deviceValue = device?.[key as keyof Device];

        if (formValue !== undefined && formValue !== deviceValue) {
          if (
            typeof formValue === "string" &&
            formValue.trim() === "" &&
            (key === "location" || key === "description")
          ) {
            payload[key] = null;
          } else {
            (
              payload as Record<
                keyof DeviceFormData,
                string | number | null | undefined
              >
            )[key] = formValue;
          }
        } else if (
          formValue === null &&
          deviceValue !== null &&
          deviceValue !== undefined
        ) {
          payload[key] = null;
        }
      }
    );

    if (Object.keys(payload).length === 0) {
      toast.info("Tidak Ada Perubahan", {
        description: "Tidak ada data yang diubah untuk disimpan.",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/devices/${deviceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.backendToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData: BackendErrorResponse = await response
          .json()
          .catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Gagal memperbarui perangkat: ${response.statusText} (${response.status})`
        );
      }
      const updatedDevice: Device = await response.json();
      setDevice(updatedDevice);
      form.reset({
        location: updatedDevice.location ?? "",
        description: updatedDevice.description ?? "",
        sensor_height_cm: updatedDevice.sensor_height_cm,
        latitude: updatedDevice.latitude,
        longitude: updatedDevice.longitude,
        alert_threshold_percentage: updatedDevice.alert_threshold_percentage,
        alert_threshold_absolute_cm: updatedDevice.alert_threshold_absolute_cm,
      });
      toast.success("Sukses!", {
        description: `Perangkat ${updatedDevice.device_id} berhasil diperbarui.`,
      });
    } catch (err) {
      console.error("Error updating device:", err);
      toast.error("Gagal Memperbarui", {
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateApiKey = async () => {
    if (!deviceId || !backendUrl || !session?.user?.backendToken) {
      toast.error("Error", {
        description:
          "Tidak bisa generate API Key: Konfigurasi atau sesi tidak valid.",
      });
      return;
    }
    setIsGeneratingApiKey(true);
    setNewApiKey(null);
    setApiKeyCopied(false);

    try {
      const response = await fetch(
        `${backendUrl}/api/devices/${deviceId}/api-key`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.user.backendToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      const responseData: BackendErrorResponse & { apiKey?: string } =
        await response.json();
      if (!response.ok) {
        throw new Error(
          responseData.message ||
            `Gagal membuat API Key baru: ${response.statusText}`
        );
      }
      if (responseData.apiKey) {
        setNewApiKey(responseData.apiKey);
        toast.success("API Key Baru Dibuat!", {
          description:
            "Harap salin dan simpan API Key ini dengan aman. Ini tidak akan ditampilkan lagi.",
          duration: 15000,
        });
        // Panggil fetchData lagi untuk mendapatkan device object terbaru
        // yang berisi api_key_updated_at
        fetchData();
      } else {
        throw new Error("API Key tidak diterima dari server.");
      }
    } catch (err) {
      console.error("Error generating API key:", err);
      toast.error("Gagal Generate API Key", {
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    } finally {
      setIsGeneratingApiKey(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (newApiKey) {
      navigator.clipboard
        .writeText(newApiKey)
        .then(() => {
          setApiKeyCopied(true);
          toast.success("Disalin!", {
            description: "API Key telah disalin ke clipboard.",
          });
          setTimeout(() => setApiKeyCopied(false), 3000);
        })
        .catch((_err) => {
          console.error("Gagal menyalin API Key ke clipboard:", _err);
          toast.error("Gagal Menyalin", {
            description: "Tidak dapat menyalin API Key.",
          });
        });
    }
  };

  if (sessionStatus === "loading" || isLoading) {
    return (
      <main className="container mx-auto p-6 flex justify-center items-center min-h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="container mx-auto p-6 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-semibold text-destructive">Error</p>
        <p className="text-muted-foreground mb-6">{pageError}</p>
        <Button
          onClick={() => router.push("/dashboard/admin/devices")}
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Manajemen Perangkat
        </Button>
      </main>
    );
  }

  if (!device) {
    return (
      <main className="container mx-auto p-6 text-center">
        <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-xl font-semibold">Perangkat Tidak Ditemukan</p>
        <p className="text-muted-foreground mb-6">
          Perangkat dengan ID yang diminta tidak dapat ditemukan.
        </p>
        <Button
          onClick={() => router.push("/dashboard/admin/devices")}
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Manajemen Perangkat
        </Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 pb-4 lg:px-6 lg:pb-6 space-y-6">
      <div>
        <Button
          onClick={() => router.push("/dashboard/admin/devices")}
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Manajemen Perangkat
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Settings2 className="mr-3 h-6 w-6 text-primary" />
              Edit Perangkat:{" "}
              <span className="font-mono ml-2 text-blue-600 dark:text-blue-400">
                {device.device_id}
              </span>
            </CardTitle>
            <CardDescription>
              Perbarui informasi konfigurasi untuk perangkat ini.
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lokasi</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Contoh: Jembatan Siliwangi"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi Tambahan</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Catatan tambahan..."
                          {...field}
                          value={field.value ?? ""}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="sensor_height_cm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tinggi Sensor dari Dasar (cm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Contoh: 200"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="alert_threshold_absolute_cm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ambang Batas Absolut (cm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Contoh: 150"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="-6.1234567"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="106.1234567"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="alert_threshold_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Ambang Batas Persentase (0.01 - 1.00)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          placeholder="Contoh: 0.80 (untuk 80%)"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? null
                                : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Persentase dari tinggi sensor. Abaikan jika menggunakan
                        ambang batas absolut.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <br />
              <CardFooter className="border-t pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting || !form.formState.isDirty}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Simpan Perubahan
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* ▼▼▼ MODIFIKASI DIMULAI DI SINI ▼▼▼ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <KeyRound className="mr-3 h-5 w-5 text-primary" />
              Manajemen API Key
            </CardTitle>
            <CardDescription>
              {device.api_key_hash
                ? "API Key sudah pernah dibuat untuk perangkat ini."
                : "Perangkat ini belum memiliki API Key."}
              Membuat API Key baru akan menggantikan yang lama (jika ada).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={isGeneratingApiKey}
                  className="w-full sm:w-auto"
                >
                  {isGeneratingApiKey ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  {device.api_key_hash
                    ? "Generate Ulang API Key"
                    : "Generate API Key"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Konfirmasi Generate API Key
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini akan membuat API Key baru untuk perangkat{" "}
                    <span className="font-semibold">{device.device_id}</span>.
                    Jika sudah ada, API Key lama akan menjadi tidak valid. Anda
                    harus mengupdate konfigurasi di perangkat ESP32 Anda.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleGenerateApiKey}
                    className="bg-destructive hover:bg-destructive/80"
                  >
                    Ya, Generate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {newApiKey && (
              <div className="mt-4 p-4 border rounded-md bg-secondary/50 space-y-2">
                <Label className="text-sm font-semibold text-foreground">
                  API Key Baru (Segera Salin!):
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    readOnly
                    value={newApiKey}
                    className="font-mono text-xs bg-background"
                  />
                  <Button
                    onClick={handleCopyToClipboard}
                    variant="outline"
                    size="icon"
                    aria-label="Salin API Key"
                  >
                    {apiKeyCopied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-destructive font-medium">
                  PERHATIAN: API Key ini hanya ditampilkan sekali. Harap salin
                  dan simpan di tempat yang aman. Anda perlu mengupdate
                  perangkat ESP32 Anda dengan key ini.
                </p>
              </div>
            )}

            {/* --- Logika Tampilan Timestamp yang Diperbarui --- */}
            {device.api_key_hash && !newApiKey && (
              <div className="text-xs text-muted-foreground italic space-y-1 pt-2">
                {device.api_key_updated_at ? (
                  <p>
                    API Key terakhir di-generate pada:{" "}
                    <span className="font-semibold">
                      {new Date(device.api_key_updated_at).toLocaleString(
                        "id-ID",
                        {
                          dateStyle: "long",
                          timeStyle: "short",
                        }
                      )}
                    </span>
                  </p>
                ) : (
                  <p>
                    API Key dibuat sebelum fitur pencatatan waktu ditambahkan.
                  </p>
                )}
                <p>
                  Konfigurasi terakhir diubah pada:{" "}
                  <span className="font-semibold">
                    {new Date(device.updated_at).toLocaleString("id-ID", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  </span>
                </p>
              </div>
            )}
            {/* --- Akhir Logika Timestamp --- */}
          </CardContent>
        </Card>
        {/* ▲▲▲ MODIFIKASI BERAKHIR DI SINI ▲▲▲ */}
      </div>
    </main>
  );
}
