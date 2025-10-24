import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@workspace/ui/components/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Settings,
  Bell,
  FolderOpen,
  Keyboard,
  Users,
  Shield,
  Palette,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [selectedCategory, setSelectedCategory] = useState("general");

  const settingsCategories = [
    {
      id: "general",
      name: "通用",
      icon: Settings,
    },
    {
      id: "notifications",
      name: "消息通知",
      icon: Bell,
    },
    {
      id: "storage",
      name: "存储管理",
      icon: FolderOpen,
    },
    {
      id: "shortcuts",
      name: "快捷键",
      icon: Keyboard,
    },
    {
      id: "privacy",
      name: "权限设置",
      icon: Users,
    },
    {
      id: "security",
      name: "登录设置",
      icon: Shield,
    },
    {
      id: "appearance",
      name: "超级调色盘",
      icon: Palette,
    },
  ];

  const renderSettingsContent = () => {
    switch (selectedCategory) {
      case "general":
        return (
          <div className="space-y-6">
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
        );

      case "notifications":
        return (
          <div className="space-y-6">
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
                  <p className="text-sm text-muted-foreground">
                    新消息时播放提示音
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>桌面通知</Label>
                  <p className="text-sm text-muted-foreground">
                    在桌面显示通知横幅
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        );

      case "storage":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">存储管理</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>自动清理缓存</Label>
                  <p className="text-sm text-muted-foreground">
                    定期清理临时文件
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>文件大小限制</Label>
                  <p className="text-sm text-muted-foreground">
                    单个文件最大 100MB
                  </p>
                </div>
                <Select defaultValue="100">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50MB</SelectItem>
                    <SelectItem value="100">100MB</SelectItem>
                    <SelectItem value="200">200MB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case "shortcuts":
        return (
          <div className="space-y-6">
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
                <kbd className="px-2 py-1 bg-muted rounded text-sm">
                  Ctrl + F
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>新建会话</Label>
                </div>
                <kbd className="px-2 py-1 bg-muted rounded text-sm">
                  Ctrl + N
                </kbd>
              </div>
            </div>
          </div>
        );

      case "privacy":
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
                  <p className="text-sm text-muted-foreground">
                    显示最后活跃时间
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>阅读状态</Label>
                  <p className="text-sm text-muted-foreground">
                    显示消息已读状态
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">登录设置</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>两步验证</Label>
                  <p className="text-sm text-muted-foreground">
                    增强账户安全性
                  </p>
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

      case "appearance":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">超级调色盘</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>主题色彩</Label>
                  <p className="text-sm text-muted-foreground">
                    选择应用主题色
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full cursor-pointer border-2 border-blue-500"></div>
                  <div className="w-8 h-8 bg-green-500 rounded-full cursor-pointer border-2 border-transparent"></div>
                  <div className="w-8 h-8 bg-purple-500 rounded-full cursor-pointer border-2 border-transparent"></div>
                  <div className="w-8 h-8 bg-red-500 rounded-full cursor-pointer border-2 border-transparent"></div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>字体大小</Label>
                </div>
                <Select defaultValue="medium">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">小</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="large">大</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      default:
        return <div>选择设置分类</div>;
    }
  };

  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <div className="h-full border-r bg-background">
            <ScrollArea className="h-full">
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">设置</h2>
                <div className="space-y-1">
                  {settingsCategories.map((category) => (
                    <div
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedCategory === category.id
                          ? "bg-accent border-l-2 border-orange-500"
                          : "hover:bg-accent"
                      }`}
                    >
                      <category.icon className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {category.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 右侧内容区 */}
        <ResizablePanel defaultSize={70} minSize={30}>
          <div className="h-full bg-background">
            <ScrollArea className="h-full">
              <div className="p-6">{renderSettingsContent()}</div>
            </ScrollArea>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
