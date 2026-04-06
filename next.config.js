// next.config.js
import NextPWA from "next-pwa"; // Ubah nama import agar lebih standar

const isDevelopment = process.env.NODE_ENV === "development";

// Konfigurasi dasar Next.js Anda
const nextConfig = {
  reactStrictMode: true,
  // Tambahkan konfigurasi Next.js lainnya di sini jika ada
};

// Konfigurasi PWA
const pwaConfig = {
  dest: "public",
  disable: isDevelopment, // next-pwa akan dinonaktifkan di development
  swSrc: "public/sw.js", // Anda menggunakan custom service worker
};

// Inisialisasi plugin PWA dengan konfigurasinya
const withPWA = NextPWA(pwaConfig);

// Ekspor konfigurasi:
// Jika development, ekspor nextConfig saja.
// Jika produksi (atau bukan development), bungkus nextConfig dengan withPWA.
export default isDevelopment ? nextConfig : withPWA(nextConfig);
