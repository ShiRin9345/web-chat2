import { createFileRoute } from "@tanstack/react-router";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

export const Route = createFileRoute("/_authenticated/settings/notifications")({
  component: NotificationsSettings,
});

function NotificationsSettings() {
  return (
    <div className="h-full bg-background">
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          <h3 className="text-lg font-semibold mb-4">消息通知</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>新消息通知</Label>
                <p className="text-sm text-muted-foreground">
                  接收新消息时显示通知
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>声音提醒</Label>
                <p className="text-sm text-muted-foreground">新消息时播放提示音</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>桌面通知</Label>
                <p className="text-sm text-muted-foreground">在桌面显示通知横幅</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
