// app/components/landing/HistorySection.tsx
"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button"; // Menggunakan tombol kita
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll"; // Menggunakan wrapper animasi kita

export default function HistorySection() {
  return (
    // Kita gunakan warna secondary untuk latar, sesuai permintaan sebelumnya agar tidak monoton
    <section id="history" className="w-full bg-secondary py-20 lg:py-28">
      <AnimateOnScroll className="container mx-auto px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Kolom Kiri: Gambar */}
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Image
              // Ganti dengan path gambar Anda yang relevan
              src="/bg.jpg"
              alt="Tim Si Cita sedang bekerja"
              width={600}
              height={400}
              className="rounded-2xl object-cover shadow-neumorphic"
            />
          </motion.div>

          {/* Kolom Kanan: Teks */}
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center lg:text-left"
          >
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Sejarah Kami
            </h2>
            <p className="mt-6 text-lg text-muted-foreground">
              {/* Teks ini diambil dari HTML teman Anda */}
              Si Cita didirikan oleh sembilan mahasiswa program studi Teknologi
              Rekayasa Komputer angkatan 59 dari IPB University, dengan nama
              Toyo Jala Vista…
            </p>
            <div className="mt-8">
              <Button size="lg">Pelajari Lebih Lanjut</Button>
            </div>
          </motion.div>
        </div>
      </AnimateOnScroll>
    </section>
  );
}
