import { createFileRoute } from "@tanstack/react-router";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";

export const Route = createFileRoute("/_authenticated/settings/privacy")({
  component: PrivacySettings,
});

function PrivacySettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">权限设置</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>在线状态</Label>
            <p className="text-sm text-muted-foreground">
              允许好友看到我的在线状态
            </p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>最后活跃时间</Label>
            <p className="text-sm text-muted-foreground">显示最后活跃时间</p>
          </div>
          <Switch />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>阅读状态</Label>
            <p className="text-sm text-muted-foreground">显示消息已读状态</p>
          </div>
          <Switch defaultChecked />
        </div>
      </div>
    </div>
  );
}

