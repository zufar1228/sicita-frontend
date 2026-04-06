// app/offline/page.tsx
import React from "react";

export default function OfflinePage() {
  return (
    <div style={{ textAlign: "center", padding: "50px", fontSize: "1.2em" }}>
      <h1>Oops! Anda sedang offline.</h1>
      <p>Silakan periksa koneksi internet Anda.</p>
      <p>Beberapa fitur mungkin tidak tersedia tanpa koneksi.</p>
    </div>
  );
}
