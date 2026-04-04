import { create } from "zustand";

interface ThemeStore {
  dark: boolean;
  toggle: () => void;
}

const saved = localStorage.getItem("theme") === "dark";
document.documentElement.classList.toggle("dark", saved);

export const useThemeStore = create<ThemeStore>((set) => ({
  dark: saved,
  toggle: () =>
    set((s) => {
      const next = !s.dark;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return { dark: next };
    }),
}));
