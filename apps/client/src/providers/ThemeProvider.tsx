"use client";

import { useEffect, useRef } from "react";
import { useThemeStore } from "@/stores/theme";
import type { ThemeId } from "@/stores/theme";

/**
 * 懒加载主题 CSS 文件并应用类名
 * 参考 Vue watch 的实现方式：
 * 1. 动态导入 CSS（懒加载）
 * 2. 在顶层元素上添加/移除类名来控制主题
 */
async function loadThemeCSS(
  themeId: ThemeId,
  oldThemeId: ThemeId | null
): Promise<void> {
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

    // CSS 加载后，在顶层元素上添加/移除类名
    // 使用 document.documentElement (html) 或 #app
    const rootElement =
      document.querySelector("#app") || document.documentElement;

    // 移除旧的主题类名
    if (oldThemeId) {
      rootElement.classList.remove(`theme-${oldThemeId}`);
    }

    // 添加新的主题类名（使用 nextTick 的概念，等待 DOM 更新）
    // 在 React 中，我们可以直接添加，因为 useEffect 已经在 DOM 更新后执行
    requestAnimationFrame(() => {
      rootElement.classList.add(`theme-${themeId}`);
    });
  } catch (error) {
    console.error(`Failed to load theme ${themeId}:`, error);
    // 如果加载失败，尝试加载默认主题
    if (themeId !== "globals") {
      await import("@workspace/ui/globals.css");
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
  const previousThemeRef = useRef<ThemeId | null>(null);

  useEffect(() => {
    const oldThemeId = previousThemeRef.current;

    // 懒加载主题CSS并应用类名
    loadThemeCSS(themeId, oldThemeId);

    // 保存当前主题，用于下次切换
    previousThemeRef.current = themeId;
  }, [themeId]);

  return <>{children}</>;
}
