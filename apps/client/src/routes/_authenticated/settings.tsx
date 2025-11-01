import {
  Outlet,
  createFileRoute,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@workspace/ui/components/resizable";
import {
  Settings,
  Bell,
  FolderOpen,
  Keyboard,
  Users,
  Shield,
  Palette,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsLayout,
});

const settingsCategories = [
  {
    id: "general",
    name: "通用",
    icon: Settings,
    path: "/settings/general",
  },
  {
    id: "notifications",
    name: "消息通知",
    icon: Bell,
    path: "/settings/notifications",
  },
  {
    id: "storage",
    name: "存储管理",
    icon: FolderOpen,
    path: "/settings/storage",
  },
  {
    id: "shortcuts",
    name: "快捷键",
    icon: Keyboard,
    path: "/settings/shortcuts",
  },
  {
    id: "privacy",
    name: "权限设置",
    icon: Users,
    path: "/settings/privacy",
  },
  {
    id: "security",
    name: "登录设置",
    icon: Shield,
    path: "/settings/security",
  },
  {
    id: "theme",
    name: "主题",
    icon: Palette,
    path: "/settings/theme",
  },
];

function SettingsLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // 获取当前激活的分类（只有明确在子路由时才高亮）
  const getActiveCategory = () => {
    const path = location.pathname;
    const category = settingsCategories.find((cat) => path === cat.path);
    return category?.id || null; // 根路由时返回 null，不显示选中样式
  };

  const activeCategory = getActiveCategory();

  // 判断是否是根路由（/settings 或 /settings/）
  const isRootRoute =
    location.pathname === "/settings" || location.pathname === "/settings/";

  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1">
      {/* 左侧面板：分类列表，小屏幕时如果是子路由则宽度为0 */}
      <ResizablePanel
        defaultSize={30}
        minSize={20}
        maxSize={40}
        className={isRootRoute ? "" : "max-md:!flex-[0]"}
      >
        <div className="h-full border-r bg-background">
          <ScrollArea className="h-full">
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">设置</h2>
              <div className="space-y-1">
                {settingsCategories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => navigate({ to: category.path })}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      activeCategory === category.id
                        ? "bg-accent border-l-2 border-orange-500"
                        : "hover:bg-accent"
                    }`}
                  >
                    <category.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle className="hidden md:flex" />

      {/* 右侧面板：具体设置内容，小屏幕时如果是根路由则宽度为0 */}
      <ResizablePanel
        defaultSize={70}
        minSize={30}
        className={isRootRoute ? "max-md:!flex-[0]" : ""}
      >
        <div className="h-full flex flex-col">
          {/* 返回按钮：只在移动端子路由时显示 */}
          {!isRootRoute && (
            <div className="border-b p-2 md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/settings" })}
                className="-ml-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <Outlet />
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
