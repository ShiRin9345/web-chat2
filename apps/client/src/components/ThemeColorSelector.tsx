import { useThemeStore } from "@/stores/theme";
import { themes } from "@/data/themes";
import { Check } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

/**
 * 主题选择器组件
 * 网格布局展示所有可用主题
 */
export function ThemeColorSelector() {
  const currentThemeId = useThemeStore((state) => state.themeId);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-2">选择主题</h4>
        <p className="text-sm text-muted-foreground mb-4">
          选择一个主题来改变应用的色彩方案
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {themes.map((theme) => {
          const isSelected = currentThemeId === theme.id;

          return (
            <button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              className={cn(
                "relative flex flex-col items-center p-4 rounded-lg border-2 transition-all",
                "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              )}
            >
              {/* 颜色预览 */}
              <div className="flex gap-1 mb-3">
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: theme.colors.secondary }}
                />
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: theme.colors.accent }}
                />
                <div
                  className="w-8 h-8 rounded border"
                  style={{ backgroundColor: theme.colors.destructive }}
                />
              </div>

              {/* 主题名称 */}
              <span className="text-sm font-medium">{theme.displayName}</span>

              {/* 选中标识 */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground">
                    <Check className="w-3 h-3" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

