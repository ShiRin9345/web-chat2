"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/stores/theme";
import type { ThemeId } from "@/stores/theme";
import { themeConfig } from "@/data/themeConfig";
import { useTheme } from "next-themes";

/**
 * 应用主题 CSS 变量到 <html> 元素的 style 属性
 * 类似 tweakcn.com 的实现方式：直接修改内联样式
 *
 * 策略：
 * - Light mode: 使用内联样式设置变量（完全通过内联样式）
 * - Dark mode: 移除内联样式变量，添加主题类名，让 CSS 文件的 .dark 规则生效
 */
function applyTheme(themeId: ThemeId, isDark: boolean): void {
  const rootElement = document.documentElement;
  const theme = themeConfig[themeId];

  if (!theme) {
    console.error(`Theme config not found for: ${themeId}`);
    return;
  }

  // 根据 dark mode 选择对应的变量
  // 兼容新旧结构：如果是旧结构（直接包含 CSS 变量），则使用旧结构；否则使用新结构（light/dark）
  let themeVars: Record<string, string>;
  if ("light" in theme && "dark" in theme) {
    // 新结构：包含 light 和 dark
    themeVars = isDark ? theme.dark : theme.light;
  } else {
    // 旧结构：直接包含 CSS 变量（临时兼容，应尽快重构）
    themeVars = theme as any;
    console.warn(
      `[ThemeProvider] Theme ${themeId} is using old structure. Please update to include light and dark variants.`
    );
  }

  if (!themeVars) {
    console.error(`Theme vars not found for: ${themeId}`);
    return;
  }

  // 移除所有可能的主题类名
  const allThemeIds: ThemeId[] = [
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
  ];
  allThemeIds.forEach((id) => {
    rootElement.classList.remove(`theme-${id}`);
  });

  // 无论是 light 还是 dark mode，都使用内联样式设置变量
  Object.entries(themeVars).forEach(([key, value]) => {
    rootElement.style.setProperty(key, value);
  });

  // 调试日志（开发环境）
  if (import.meta.env.DEV) {
    console.log(`[ThemeProvider] Applied theme: ${themeId}`, {
      isDark,
      mode: "inline styles",
    });
  }
}

/**
 * 清除所有主题样式（只清除 CSS 变量，保留其他样式）
 */
function clearTheme(themeId: ThemeId): void {
  const rootElement = document.documentElement;
  const theme = themeConfig[themeId];

  if (theme) {
    // 清除所有主题相关的 CSS 变量
    // 兼容新旧结构
    const varsToClear = "light" in theme ? theme.light : (theme as any);
    Object.keys(varsToClear).forEach((key) => {
      rootElement.style.removeProperty(key);
    });
  }
}

/**
 * 主题 Provider
 * 监听主题变化并直接设置 CSS 变量到 <html> 元素的 style 属性
 * Dark mode 处理：
 *   - Light mode: 使用内联样式设置变量（优先级高）
 *   - Dark mode: 清除内联样式，让 CSS 文件的 .dark 选择器生效
 * 类似 tweakcn.com 的实现方式，无需加载外部 CSS 文件
 * 仅在已认证路由中使用，离开时自动清理样式
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeId = useThemeStore((state) => state.themeId);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    // 应用主题 CSS 变量（根据 dark mode 状态）
    applyTheme(themeId, isDark);

    // 清理函数：组件卸载时清除样式
    return () => {
      clearTheme(themeId);
    };
  }, [themeId, isDark, resolvedTheme]);

  return <>{children}</>;
}
