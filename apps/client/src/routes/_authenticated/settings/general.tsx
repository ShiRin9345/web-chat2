import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

export const Route = createFileRoute("/_authenticated/settings/general")({
  component: GeneralSettings,
});

function GeneralSettings() {
  return (
    <div className="h-full bg-background">
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* 外观设置 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">外观设置</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="border-2 border-blue-500 rounded-lg p-4 cursor-pointer">
                <div className="w-full h-16 bg-white border rounded mb-2"></div>
                <p className="text-sm text-center">白天模式</p>
              </div>
              <div className="border rounded-lg p-4 cursor-pointer hover:border-blue-500">
                <div className="w-full h-16 bg-gray-800 border rounded mb-2"></div>
                <p className="text-sm text-center">夜间模式</p>
              </div>
              <div className="border rounded-lg p-4 cursor-pointer hover:border-blue-500">
                <div className="w-full h-16 bg-linear-to-r from-white to-gray-800 border rounded mb-2"></div>
                <p className="text-sm text-center">跟随系统</p>
              </div>
            </div>
            <Button variant="link" className="p-0 h-auto text-blue-600">
              切换色彩主题
            </Button>
          </div>

          {/* 聊天设置 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">聊天</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>发送消息</Label>
                  <p className="text-sm text-muted-foreground">
                    设置发送消息的快捷键
                  </p>
                </div>
                <Select defaultValue="enter">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enter">Enter</SelectItem>
                    <SelectItem value="ctrl+enter">Ctrl+Enter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>双击会话列表打开独立聊天窗口</Label>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>表情推荐</Label>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>快捷输入表情</Label>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>输入"/"时唤起</Label>
                </div>
                <Select defaultValue="emoji">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emoji">表情</SelectItem>
                    <SelectItem value="command">命令</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 文件设置 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">文件</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>拖拽文件时,唤起闪传悬浮窗快速分享</Label>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>使用内置查看器打开本地office文件</Label>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>使用内置查看器打开在线文档</Label>
                </div>
                <Switch />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
