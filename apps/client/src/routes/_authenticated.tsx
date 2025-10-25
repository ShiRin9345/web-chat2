import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
} from "@workspace/ui/components/sidebar";
import { SocketProvider } from "@/providers/SocketProvider";
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
import { MessageSquare, Users, Settings } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useNavigate } from "@tanstack/react-router";
import { UserProfilePopover } from "@/components/UserProfilePopover";
import { DialogProvider } from "@/provider/DialogProvider";

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
      icon: Settings,
      label: "设置",
      href: "/settings",
    },
  ];

  return (
    <TooltipProvider>
      <SocketProvider>
        <SidebarProvider>
          <div className="flex h-screen w-full">
            <Sidebar className="border-r">
              <SidebarContent className="flex flex-col items-center py-4">
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
              </SidebarContent>
            </Sidebar>
            <Outlet />
          </div>
          <DialogProvider />
        </SidebarProvider>
      </SocketProvider>
    </TooltipProvider>
  );
}
