import { create } from "zustand";
import { persist } from "zustand/middleware";

export const AVAILABLE_THEMES = [
  "globals",
  "orange",
  "quantum-rose",
  "claude",
  "amethyst-haze",
  "bold-tech",
  "kodama-grove",
  "soft-pop",
  "starry-night",
  "bugglegum",
] as const;

export type ThemeId = (typeof AVAILABLE_THEMES)[number];

interface ThemeState {
  themeId: ThemeId;
  setTheme: (themeId: ThemeId) => void;
}

const DEFAULT_THEME: ThemeId = "globals";

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: DEFAULT_THEME,
      setTheme: (themeId) => {
        set({ themeId });
      },
    }),
    {
      name: "theme-storage",
      partialize: (state) => ({
        themeId: state.themeId,
      }),
    }
  )
);
