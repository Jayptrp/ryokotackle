"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";

export function DarkModeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    const nextTheme = isDark ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  if (!mounted) {
    // Return a matching sized placeholder during SSR/mount to avoid layout shift and mismatch
    return (
      <div className="w-10 h-10 flex items-center justify-center">
        <span className="w-6 h-6 animate-pulse bg-muted rounded-full opacity-20" />
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="rounded-full p-base text-primary transition-all hover:bg-surface-container-low flex items-center justify-center w-10 h-10 focus:outline-none"
    >
      <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} />
    </button>
  );
}
