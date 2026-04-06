// app/api/auth/[...nextauth]/route.ts

import NextAuth, { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

interface AppUserFromBackend {
  id: number;
  username: string;
  email: string;
  role: string;
  provider?: string;
}
interface BackendLoginResponse {
  user: AppUserFromBackend;
  token: string;
}

interface BackendError {
  message: string;
  [key: string]: unknown;
}

const backendBaseUrl =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;

const authOptions: NextAuthOptions = {
  providers: [
    // ------------------ Credentials Provider ------------------
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        emailOrUsername: {
          label: "Email atau Username",
          type: "text",
          placeholder: "email@example.com atau username",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<NextAuthUser | null> {
        // Tentukan tipe return di sini
        if (
          !credentials?.emailOrUsername ||
          !credentials?.password ||
          !backendBaseUrl
        ) {
          console.error(
            "[CredentialsProvider] Missing credentials or backend URL"
          );
          return null;
        }
        // Panggil login endpoint di backend Anda
        const res = await fetch(`${backendBaseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailOrUsername: credentials.emailOrUsername,
            password: credentials.password,
          }),
        });
        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ message: `Login gagal: Status ${res.status}` }));
          console.error(
            "[CredentialsProvider] Backend login error:",
            errorData
          );
          // Gunakan tipe BackendError jika errorData memiliki struktur yang sesuai
          const typedErrorData = errorData as BackendError;
          throw new Error(
            typedErrorData.message || `Login gagal: Status ${res.status}`
          );
        }
        const backendResponse: BackendLoginResponse = await res.json();
        const { user, token } = backendResponse;

        // Kembalikan objek user yang akan masuk ke callback jwt
        // Properti ini akan tersedia di `user` pada callback `jwt` karena augmentasi tipe kita
        return {
          id: String(user.id),
          name: user.username,
          email: user.email,
          role: user.role,
          backendToken: token,
          provider: "credentials", // Tambahkan provider di sini
        };
      },
    }),

    // ------------------ Google OAuth Provider ------------------
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],

  // Kita pakai JWT untuk session
  session: { strategy: "jwt" },

  callbacks: {
    // dipanggil saat signIn pertama (sebelum jwt)
    async signIn({ user, account }) {
      console.log(
        `[NextAuth signIn CB] Provider: ${account?.provider}, User ID:`,
        user?.id
      );
      // Anda bisa putusan di sini (return false untuk menolak)
      return true;
    },

    // dipanggil setiap membuat/memperbarui JWT
    async jwt({ token, user, account, profile }) {
      // Jika login pertama (credentials atau Google)
      if (account && user) {
        // salin properti dasar yang umum
        token.id = user.id; // user.id sudah string dari authorize atau Google
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image; // user.image dari Google atau bisa null/undefined

        // ====== Alur Google OAuth ke backend ======
        if (account.provider === "google" && profile) {
          console.log(
            "[NextAuth jwt CB] Google Sign-In. Memanggil backend/oauth-handler..."
          );
          if (!backendBaseUrl) {
            console.error("[NextAuth jwt CB] backendBaseUrl tidak diset");
            throw new Error("Server config error: backendBaseUrl undefined");
          }
          // Kirim profile Google ke backend
          // Pastikan profile.email, .name, .sub, .image ada dan sesuai ekspektasi backend
          const googlePayload = {
            email: profile.email, // Mungkin perlu penanganan jika bisa null/undefined
            name: profile.name, // Mungkin perlu penanganan jika bisa null/undefined
            provider: account.provider,
            providerAccountId: profile.sub, // sub adalah ID Google user
            image: profile.image ?? profile.image, // profile.picture atau profile.image
          };
          const backendRes = await fetch(
            `${backendBaseUrl}/api/auth/oauth-handler`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(googlePayload),
            }
          );

          if (!backendRes.ok) {
            const backendErrorResponse = await backendRes
              .json()
              .catch(() => ({ message: "Unknown backend error" }));
            console.error(
              "[NextAuth jwt CB] OAuth-handler error:",
              backendErrorResponse
            );
            // PERBAIKAN UNTUK BARIS 145
            // Gunakan tipe BackendError yang telah kita definisikan (bisa dari next-auth.d.ts atau lokal)
            const errorData = backendErrorResponse as BackendError;
            throw new Error(
              errorData.message || "Gagal memproses login Google di backend."
            );
          }

          const backendLoginData =
            (await backendRes.json()) as BackendLoginResponse;
          const { user: appUser, token: backendJwt } = backendLoginData;

          // Ambil token & user dari backend dan update JWT NextAuth
          token.id = String(appUser.id); // Pastikan id adalah string
          token.name = appUser.username;
          token.email = appUser.email;
          token.role = appUser.role;
          token.backendToken = backendJwt;
          token.provider = appUser.provider || account.provider; // Gunakan provider dari backend atau dari account
          // token.picture bisa diupdate dari appUser.image jika ada

          console.log(
            "[NextAuth jwt CB] OAuth-handler sukses, token diperbarui."
          );
        }

        // ====== Alur Credentials ======
        // Properti `role`, `backendToken`, `provider` sekarang dikenali pada `user`
        // berkat augmentasi tipe di `next-auth.d.ts`.
        if (account.provider === "credentials") {
          // PERBAIKAN UNTUK BARIS 165
          token.role = user.role; // Tidak perlu `as any`
          // PERBAIKAN UNTUK BARIS 166
          token.backendToken = user.backendToken; // Tidak perlu `as any`
          // PERBAIKAN UNTUK BARIS 167
          token.provider = user.provider || "credentials"; // Tidak perlu `as any`, fallback jika user.provider undefined
        }
      }
      return token;
    },

    // dipanggil saat membuat session untuk client
    async session({ session, token }) {
      // `token` di sini adalah JWT yang sudah diperkaya dari callback `jwt`
      // dan tipenya sudah kita augmentasi di `next-auth.d.ts`
      if (token && session.user) {
        session.user.id = token.id!; // id sudah string dari JWT
        session.user.role = token.role;
        session.user.backendToken = token.backendToken;
        session.user.provider = token.provider;
        session.user.image = token.picture; // Gunakan token.picture untuk konsistensi
      }
      return session;
    },
  },

  // Kustom page
  pages: {
    signIn: "/login",
    error: "/auth/error", // Halaman untuk menampilkan error (termasuk yang dari throw new Error)
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
