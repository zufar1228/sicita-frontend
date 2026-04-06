// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import NextAuthSessionProvider from "@/providers/SessionProvider";
import { DemoProvider } from "@/lib/demo/context";

const inter = Inter({ subsets: ["latin"] });

// Metadata Next.js (tetap di sini untuk SEO dan metadata umum)
export const metadata: Metadata = {
  title: "SiCita - Aplikasi Monitoring Banjir",
  description: "Aplikasi monitoring dan peringatan banjir yang inovatif.",
  // Tidak perlu lagi themeColor di sini jika sudah ada di manifest.json
  // themeColor: "#ffffff",
  // viewport: "width=device-width, initial-scale=1, viewport-fit=cover", // Akan ditangani oleh next-pwa atau melalui meta tag manual jika diperlukan khusus
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />

        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      <body className={inter.className}>
        <NextAuthSessionProvider>
          <DemoProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster richColors position="top-right" />
            </ThemeProvider>
          </DemoProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
