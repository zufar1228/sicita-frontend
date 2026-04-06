// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Perluas tipe User. Ini adalah tipe objek `user` yang dikembalikan oleh
   * callback `authorize` dan diterima oleh callback `jwt` pada sign-in pertama.
   * DefaultUser sudah memiliki: `id: string`, `name?: string | null`, `email?: string | null`, `image?: string | null`.
   */
  interface User extends DefaultUser {
    // Properti kustom Anda:
    username?: string | null; // Tambahkan username
    role?: string | null;
    backendToken?: string | null;
    provider?: string | null;
    // `id` sudah ada dari DefaultUser, pastikan konsisten dengan backend Anda.
    // Jika ID dari backend Anda bukan string, Anda mungkin perlu menyesuaikannya di sini
    // dan di callback `authorize` serta `jwt`. Namun, NextAuth umumnya mengharapkan string.
  }

  /**
   * Perluas tipe Session. Ini adalah tipe objek `session` yang dikembalikan
   * oleh `useSession()`, `getSession()`, dan diterima oleh callback `session`.
   */
  interface Session extends DefaultSession {
    // DefaultSession["user"] sudah memiliki `name`, `email`, `image`.
    // Kita perluas objek `user` di dalam `session`.
    user?: {
      // Properti dari DefaultSession["user"] akan otomatis tergabung jika Anda tidak mendefinisikannya ulang.
      // Namun, untuk kejelasan dan kontrol penuh, kita bisa definisikan secara eksplisit.
      name?: string | null;
      email?: string | null;
      image?: string | null;

      // Properti kustom atau yang ingin kita pastikan tipenya:
      id: string; // Jadikan `id` wajib dan bertipe string pada sesi.
      username?: string | null; // Tambahkan username
      role?: string | null;
      backendToken?: string | null; // Token dari backend Anda untuk API calls
      provider?: string | null; // Provider yang digunakan untuk login
    };
    // Jika Anda ingin menyimpan backendToken langsung di root session object:
    // backendToken?: string | null;
    // error?: string | null; // Contoh jika Anda ingin menyimpan pesan error di sesi
  }
}

declare module "next-auth/jwt" {
  /**
   * Perluas tipe JWT. Ini adalah tipe objek `token` yang digunakan
   * dalam callback `jwt` dan diterima oleh callback `session`.
   * DefaultJWT sudah memiliki: `name`, `email`, `picture`, `sub` (biasanya user ID).
   */
  interface JWT extends DefaultJWT {
    // Properti kustom Anda yang ingin Anda teruskan dari `user` (setelah authorize atau OAuth)
    // ke `session` melalui `token`.
    id?: string; // Biasanya di-map dari user.id atau token.sub
    username?: string | null; // Tambahkan username
    role?: string | null;
    backendToken?: string | null;
    provider?: string | null;

    // Properti OAuth standar yang mungkin ingin Anda teruskan (jika relevan)
    accessToken?: string; // Untuk OAuth provider access token
    refreshToken?: string; // Untuk OAuth provider refresh token
    idToken?: string; // Untuk OAuth provider ID token
    expires_at?: number; // Waktu kedaluwarsa token
    // error?: string; // Untuk menangani error refresh token, dll.
  }
}
