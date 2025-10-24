import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { LogOut, Settings } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useDialogStore } from "@/stores/dialog";

interface UserProfilePopoverProps {
  children: React.ReactNode;
}

export function UserProfilePopover({ children }: UserProfilePopoverProps) {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const { openDialog } = useDialogStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/signIn" });
  };

  const handleEditProfile = () => {
    openDialog("editProfile");
    setIsOpen(false);
  };

  const handleSendMessage = () => {
    // 暂时跳转到消息页面
    navigate({ to: "/messages" });
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-6">
          {/* 用户信息区域 */}
          <div className="flex items-start space-x-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback className="text-lg">
                  {session?.user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              {/* 在线状态指示器 */}
              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold truncate">
                  {session?.user?.name || "用户"}
                </h3>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    在线
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        退出登录
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {session?.user?.email || "user@example.com"}
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          {/* 操作按钮 */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleEditProfile}
            >
              编辑资料
            </Button>
            <Button className="flex-1" onClick={handleSendMessage}>
              发消息
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
