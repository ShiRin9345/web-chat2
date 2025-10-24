import { createFileRoute } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { Switch } from "@workspace/ui/components/switch";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Camera, Bell, Shield, Palette, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: session } = authClient.useSession();

  return (
    <div className="h-full flex flex-col">
      {/* 顶部标题 */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">设置</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* 个人信息 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              个人信息
            </h3>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={session?.user?.image} />
                  <AvatarFallback>
                    {session?.user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full"
                  variant="secondary"
                >
                  <Camera className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex-1">
                <Label htmlFor="name">姓名</Label>
                <Input
                  id="name"
                  defaultValue={session?.user?.name || ""}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                defaultValue={session?.user?.email || ""}
                className="mt-1"
                disabled
              />
            </div>
          </div>

          <Separator />

          {/* 通知设置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              通知设置
            </h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <div>
                  <Label>新消息通知</Label>
                  <p className="text-xs text-muted-foreground">
                    接收新消息时显示通知
                  </p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <div>
                  <Label>声音提醒</Label>
                  <p className="text-xs text-muted-foreground">
                    新消息时播放提示音
                  </p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>

          <Separator />

          {/* 隐私设置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              隐私设置
            </h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <div>
                  <Label>在线状态</Label>
                  <p className="text-xs text-muted-foreground">
                    允许好友看到我的在线状态
                  </p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <div>
                  <Label>最后活跃时间</Label>
                  <p className="text-xs text-muted-foreground">
                    显示最后活跃时间
                  </p>
                </div>
              </div>
              <Switch />
            </div>
          </div>

          <Separator />

          {/* 外观设置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              外观设置
            </h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Palette className="h-4 w-4" />
                <div>
                  <Label>深色模式</Label>
                  <p className="text-xs text-muted-foreground">使用深色主题</p>
                </div>
              </div>
              <Switch />
            </div>
          </div>

          <Separator />

          {/* 账户操作 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              账户
            </h3>

            <Button variant="outline" className="w-full">
              修改密码
            </Button>

            <Button variant="outline" className="w-full">
              导出数据
            </Button>

            <Button
              variant="destructive"
              className="w-full"
              onClick={() => authClient.signOut()}
            >
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
