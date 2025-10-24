import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
} from "@workspace/ui/components/sidebar";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@workspace/ui/components/resizable";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  MessageSquare,
  Users,
  UserPlus,
  Settings,
  LogOut,
  Bell,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    const session = await context.auth.getSession();
    if (!session?.data?.user) {
      throw redirect({ to: "/signIn" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/signIn" });
  };

  const navigationItems = [
    {
      icon: MessageSquare,
      label: "消息",
      href: "/messages",
      badge: 0,
    },
    {
      icon: Users,
      label: "联系人",
      href: "/contacts",
    },
    {
      icon: UserPlus,
      label: "群聊",
      href: "/groups",
    },
    {
      icon: Bell,
      label: "好友申请",
      href: "/requests",
      badge: 3, // 模拟未读申请数量
    },
    {
      icon: Settings,
      label: "设置",
      href: "/settings",
    },
  ];

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full">
          {/* 左侧导航栏 */}
          <Sidebar className="w-16 border-r">
            <SidebarContent className="flex flex-col items-center py-4">
              {/* 导航图标 */}
              <div className="flex flex-col items-center space-y-2">
                {navigationItems.map((item) => (
                  <Tooltip key={item.label}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => navigate({ to: item.href })}
                        className="relative flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent transition-colors"
                      >
                        <item.icon className="h-5 w-5" />
                        {item.badge && item.badge > 0 && (
                          <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>

              <Separator className="my-4" />

              {/* 用户头像和菜单 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session?.user?.image || undefined} />
                      <AvatarFallback>
                        {session?.user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarContent>
          </Sidebar>

          {/* 中间和右侧区域 */}
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* 中间列表栏 */}
            <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
              <div className="h-full border-r">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <h2 className="text-lg font-semibold mb-4">最近会话</h2>
                    {/* 这里将根据路由显示不同的列表内容 */}
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg hover:bg-accent cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>JD</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">张三</p>
                            <p className="text-xs text-muted-foreground truncate">
                              你好，最近怎么样？
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            2
                          </Badge>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg hover:bg-accent cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>LS</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">李四</p>
                            <p className="text-xs text-muted-foreground truncate">
                              明天见！
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* 右侧内容区 */}
            <ResizablePanel>
              <SidebarInset>
                <div className="h-full">
                  <Outlet />
                </div>
              </SidebarInset>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
