import { createFileRoute } from "@tanstack/react-router";
import { ThemeColorSelector } from "@/components/ThemeColorSelector";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

export const Route = createFileRoute("/_authenticated/settings/theme")({
  component: ThemeSettings,
});

function ThemeSettings() {
  return (
    <div className="h-full bg-background">
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          <h3 className="text-lg font-semibold mb-4">外观设置</h3>
          <div className="space-y-6">
            {/* 主题选择器 */}
            <ThemeColorSelector />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
