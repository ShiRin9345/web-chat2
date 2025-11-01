"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/stores/theme";
import type { ThemeId } from "@/stores/theme";

/**
 * 懒加载主题 CSS 文件并应用类名
 * 参考 Vue watch 的实现方式：
 * 1. 动态导入 CSS（懒加载）
 * 2. 在顶层元素上添加/移除类名来控制主题
 */
async function loadThemeCSS(themeId: ThemeId): Promise<void> {
  // 获取 <html> 元素（必须在 try 外部，以便 catch 中也能访问）
  const rootElement = document.documentElement;

  // 动态导入新的主题CSS（懒加载）
  try {
    switch (themeId) {
      case "globals":
        await import("@workspace/ui/globals.css");
        break;
      case "orange":
        await import("@workspace/ui/orange.css");
        break;
      case "quantum-rose":
        await import("@workspace/ui/quantum-rose.css");
        break;
      case "claude":
        await import("@workspace/ui/claude.css");
        break;
      case "amethyst-haze":
        await import("@workspace/ui/amethyst-haze.css");
        break;
      case "bold-tech":
        await import("@workspace/ui/bold-tech.css");
        break;
      case "kodama-grove":
        await import("@workspace/ui/kodama-grove.css");
        break;
      case "soft-pop":
        await import("@workspace/ui/soft-pop.css");
        break;
      case "starry-night":
        await import("@workspace/ui/starry-night.css");
        break;
      default:
        await import("@workspace/ui/globals.css");
    }

    // CSS 加载后，在 <html> 元素上添加/移除类名
    // 移除所有可能的主题类名（避免残留）
    const themeNames = [
      "globals",
      "orange",
      "quantum-rose",
      "claude",
      "amethyst-haze",
      "bold-tech",
      "kodama-grove",
      "soft-pop",
      "starry-night",
    ];
    themeNames.forEach((name) => {
      rootElement.classList.remove(`theme-${name}`);
    });

    // 立即添加新的主题类名
    rootElement.classList.add(`theme-${themeId}`);

    // 调试日志（开发环境）
    if (import.meta.env.DEV) {
      console.log(`[ThemeProvider] Applied theme: ${themeId}`, {
        className: `theme-${themeId}`,
        htmlClasses: rootElement.className,
      });
    }
  } catch (error) {
    console.error(`Failed to load theme ${themeId}:`, error);
    // 如果加载失败，尝试加载默认主题
    if (themeId !== "globals") {
      await import("@workspace/ui/globals.css");
      rootElement.classList.add(`theme-globals`);
    }
  }
}

/**
 * 主题 Provider
 * 监听主题变化并懒加载对应的 CSS 文件
 * 通过添加/移除类名来控制主题，避免CSS冲突
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeId = useThemeStore((state) => state.themeId);

  useEffect(() => {
    // 懒加载主题CSS并应用类名
    loadThemeCSS(themeId);
  }, [themeId]);

  return <>{children}</>;
}
