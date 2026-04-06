import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Tambahkan objek konfigurasi kustom Anda di sini
  {
    files: ["**/*.ts", "**/*.tsx"], // Terapkan aturan ini pada file TypeScript
    // Konfigurasi dari `next/typescript` seharusnya sudah mengatur parser dan plugin TypeScript.
    // Jadi, kita bisa langsung mendefinisikan aturan di sini.
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn", // Anda bisa menggunakan "error" jika ingin menjadikannya error, bukan peringatan
        {
          vars: "all", // Periksa semua variabel (default)
          args: "after-used", // Periksa argumen fungsi setelah argumen yang digunakan (default)
          ignoreRestSiblings: true, // Abaikan sibling dari rest property (umumnya berguna)
          varsIgnorePattern: "^_", // Abaikan variabel yang namanya diawali dengan underscore
          argsIgnorePattern: "^_", // Abaikan argumen fungsi yang namanya diawali dengan underscore
        },
      ],
    },
  },
];

export default eslintConfig;
