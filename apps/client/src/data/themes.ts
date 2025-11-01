import type { ThemeId } from "@/stores/theme";

export interface Theme {
  id: ThemeId;
  displayName: string;
  // 主要颜色预览（用于卡片显示）
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    destructive: string;
  };
}

export const themes: Theme[] = [
  {
    id: "globals",
    displayName: "默认",
    colors: {
      primary: "oklch(0.205 0 0)",
      secondary: "oklch(0.97 0 0)",
      accent: "oklch(0.97 0 0)",
      destructive: "oklch(0.577 0.245 27.325)",
    },
  },
  {
    id: "orange",
    displayName: "橙色",
    colors: {
      primary: "oklch(0.7357 0.1641 34.7091)",
      secondary: "oklch(0.9596 0.02 28.9029)",
      accent: "oklch(0.8278 0.1131 57.9984)",
      destructive: "oklch(0.6122 0.2082 22.241)",
    },
  },
  {
    id: "quantum-rose",
    displayName: "量子玫瑰",
    colors: {
      primary: "oklch(0.6002 0.2414 0.1348)",
      secondary: "oklch(0.923 0.0701 326.1273)",
      accent: "oklch(0.8766 0.0828 344.8849)",
      destructive: "oklch(0.5831 0.1911 6.341)",
    },
  },
  {
    id: "claude",
    displayName: "克劳德",
    colors: {
      primary: "oklch(0.6171 0.1375 39.0427)",
      secondary: "oklch(0.9245 0.0138 92.9892)",
      accent: "oklch(0.9245 0.0138 92.9892)",
      destructive: "oklch(0.1908 0.002 106.5859)",
    },
  },
  {
    id: "amethyst-haze",
    displayName: "紫水晶雾",
    colors: {
      primary: "oklch(0.488 0.243 264.376)",
      secondary: "oklch(0.963 0.017 278.326)",
      accent: "oklch(0.876 0.082 344.885)",
      destructive: "oklch(0.704 0.191 22.216)",
    },
  },
  {
    id: "bold-tech",
    displayName: "粗体科技",
    colors: {
      primary: "oklch(0.488 0.243 264.376)",
      secondary: "oklch(0.963 0.017 278.326)",
      accent: "oklch(0.876 0.082 344.885)",
      destructive: "oklch(0.704 0.191 22.216)",
    },
  },
  {
    id: "kodama-grove",
    displayName: "木灵林",
    colors: {
      primary: "oklch(0.488 0.243 264.376)",
      secondary: "oklch(0.963 0.017 278.326)",
      accent: "oklch(0.876 0.082 344.885)",
      destructive: "oklch(0.704 0.191 22.216)",
    },
  },
  {
    id: "soft-pop",
    displayName: "柔和流行",
    colors: {
      primary: "oklch(0.488 0.243 264.376)",
      secondary: "oklch(0.963 0.017 278.326)",
      accent: "oklch(0.876 0.082 344.885)",
      destructive: "oklch(0.704 0.191 22.216)",
    },
  },
  {
    id: "starry-night",
    displayName: "星空夜",
    colors: {
      primary: "oklch(0.488 0.243 264.376)",
      secondary: "oklch(0.963 0.017 278.326)",
      accent: "oklch(0.876 0.082 344.885)",
      destructive: "oklch(0.704 0.191 22.216)",
    },
  },
];

export const getThemeById = (id: ThemeId): Theme | undefined => {
  return themes.find((theme) => theme.id === id);
};

