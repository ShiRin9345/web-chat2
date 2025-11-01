import { useNavigate } from "@tanstack/react-router";
import { MessageSquare, Users, Settings, Bot } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

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

export function MobileFooter() {
  const navigate = useNavigate();

  return (
    <TooltipProvider>
      <footer className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-sidebar-border bg-sidebar text-sidebar-foreground">
        <nav className="flex items-center justify-around h-full">
          {navigationItems.map((item) => {
            return (
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
                <TooltipContent side="top">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </footer>
    </TooltipProvider>
  );
}
