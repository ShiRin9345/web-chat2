import { createFileRoute } from "@tanstack/react-router";
import { ThemeColorSelector } from "@/components/ThemeColorSelector";

export const Route = createFileRoute("/_authenticated/settings/theme")({
  component: ThemeSettings,
});

function ThemeSettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">外观设置</h3>
      <div className="space-y-6">
        {/* 主题选择器 */}
        <ThemeColorSelector />
      </div>
    </div>
  );
}
