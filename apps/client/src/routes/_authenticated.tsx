import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
} from "@workspace/ui/components/sidebar";
import { SocketProvider } from "@/providers/SocketProvider";
import { useInitializeOfflineUnreads } from "@/hooks/useInitializeOfflineUnreads";
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
import { MessageSquare, Users, Settings, Bot } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useNavigate } from "@tanstack/react-router";
import { UserProfilePopover } from "@/components/UserProfilePopover";
import { DialogProvider } from "@/providers/DialogProvider";
import { CallProvider } from "@/providers/CallProvider";
import { Toaster } from "@workspace/ui/components/sonner";
import { ModeToggle } from "@/components/mode-toggle";
import { MobileHeader } from "@/components/MobileHeader";
import { MobileFooter } from "@/components/MobileFooter";
import { cn } from "@workspace/ui/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session, isPending } = authClient.useSession();

  // 判断是否在聊天详情页或 AI 助手页（不显示 header 和 footer）
  const isChatDetailPage =
    (location.pathname.startsWith("/messages/") &&
      location.pathname !== "/messages" &&
      location.pathname !== "/messages/") ||
    location.pathname === "/assistant";

  // 初始化离线未读计数
  useInitializeOfflineUnreads();

  // 在组件内部处理认证状态
  useEffect(() => {
    if (!isPending && !session?.user) {
      navigate({ to: "/signIn" });
    }
  }, [session, isPending, navigate]);

  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

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
      icon: Bot,
      label: "AI助手",
      href: "/assistant",
    },
    {
      icon: Settings,
      label: "设置",
      href: "/settings",
    },
  ];

  return (
    <TooltipProvider>
      <SocketProvider>
        <SidebarProvider>
          {/* 移动端 Header（小于 md 时显示，包含 ModeToggle 和 UserProfilePopover） */}
          {!isChatDetailPage && <MobileHeader />}

          <div className="flex h-screen w-full">
            {/* 桌面端 Sidebar（大于等于 md 时显示） */}
            <Sidebar className="border-r hidden md:block">
              <SidebarContent className="flex flex-col items-center py-4 h-full">
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

                <div className="flex-1" />

                <Separator className="my-4" />

                {/* 用户头像和菜单 - 在底部对齐 */}
                <div className="flex flex-col items-center space-y-2">
                  <ModeToggle />
                  <UserProfilePopover>
                    <button className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent transition-colors">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session?.user?.image || undefined} />
                        <AvatarFallback>
                          {session?.user?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </UserProfilePopover>
                </div>
              </SidebarContent>
            </Sidebar>

            {/* 主内容区 - 移动端需要为 header 和 footer 留出空间 */}
            <div
              className={cn(
                "flex-1 flex flex-col overflow-hidden",
                !isChatDetailPage && "pt-14 pb-16 md:pt-0 md:pb-0"
              )}
            >
              <Outlet />
            </div>
          </div>

          {/* 移动端 Footer（小于 md 时显示，包含导航项） */}
          {!isChatDetailPage && <MobileFooter />}

          <Toaster />
          <DialogProvider />
          <CallProvider />
        </SidebarProvider>
      </SocketProvider>
    </TooltipProvider>
  );
}
