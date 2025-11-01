import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";

export const Route = createFileRoute("/_authenticated/settings/security")({
  component: SecuritySettings,
});

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">登录设置</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>两步验证</Label>
            <p className="text-sm text-muted-foreground">增强账户安全性</p>
          </div>
          <Switch />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>自动登录</Label>
            <p className="text-sm text-muted-foreground">记住登录状态</p>
          </div>
          <Switch defaultChecked />
        </div>
        <Button variant="outline" className="w-full">
          修改密码
        </Button>
      </div>
    </div>
  );
}
