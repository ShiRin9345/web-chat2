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
} from "lucide-react";

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

  // 获取当前激活的分类
  const getActiveCategory = () => {
    const path = location.pathname;
    const category = settingsCategories.find((cat) => path === cat.path);
    return category?.id || "general";
  };

  const activeCategory = getActiveCategory();

  // 判断是否是根路由（/settings 或 /settings/）
  // 注意：/settings 会自动重定向到 /settings/general，但在重定向前它仍然是根路由
  const isRootRoute =
    location.pathname === "/settings" || location.pathname === "/settings/";

  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1">
      {/* 左侧面板：小屏幕时，如果是子路由则宽度为0 */}
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

      {/* 右侧内容区：小屏幕时，如果是根路由则宽度为0 */}
      <ResizablePanel
        defaultSize={70}
        minSize={30}
        className={isRootRoute ? "max-md:!flex-[0]" : ""}
      >
        <div className="h-full bg-background">
          <ScrollArea className="h-full">
            <div className="p-6">
              <Outlet />
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
