import { createFileRoute } from "@tanstack/react-router";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

export const Route = createFileRoute("/_authenticated/settings/shortcuts")({
  component: ShortcutsSettings,
});

function ShortcutsSettings() {
  return (
    <div className="h-full bg-background">
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          <h3 className="text-lg font-semibold mb-4">快捷键</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>发送消息</Label>
              </div>
              <kbd className="px-2 py-1 bg-muted rounded text-sm">Enter</kbd>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>搜索</Label>
              </div>
              <kbd className="px-2 py-1 bg-muted rounded text-sm">Ctrl + F</kbd>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>新建会话</Label>
              </div>
              <kbd className="px-2 py-1 bg-muted rounded text-sm">Ctrl + N</kbd>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
