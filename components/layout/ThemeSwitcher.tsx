// components/layout/ThemeSwitcher.tsx (atau path lain yang Anda inginkan)
"use client";

import * as React from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeSwitcher() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* TAMBAHKAN className="relative" di sini */}
        <Button size="icon" aria-label="Ganti tema" className="relative">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Ganti tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Terang
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Gelap
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Laptop className="mr-2 h-4 w-4" />
          Sistem
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeSwitcherButtons() {
  const { setTheme } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setTheme("light")}>
        <Sun className="mr-2 h-4 w-4" /> Terang
      </Button>
      <Button variant="outline" size="sm" onClick={() => setTheme("dark")}>
        <Moon className="mr-2 h-4 w-4" /> Gelap
      </Button>
      <Button variant="outline" size="sm" onClick={() => setTheme("system")}>
        <Laptop className="mr-2 h-4 w-4" /> Sistem
      </Button>
    </div>
  );
}
