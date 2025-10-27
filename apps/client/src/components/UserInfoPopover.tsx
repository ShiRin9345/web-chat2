import { useState } from "react";
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
import { Copy, Check } from "lucide-react";

interface UserInfoPopoverProps {
  children: React.ReactNode;
  userId: string;
  userName: string;
  userAvatar: string | null;
  userEmail?: string | null;
  userCode?: string | null;
}

export function UserInfoPopover({
  children,
  userName,
  userAvatar,
  userEmail,
  userCode,
}: UserInfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (userCode) {
      try {
        await navigator.clipboard.writeText(userCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-6">
          {/* 用户信息区域 */}
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userAvatar || undefined} />
              <AvatarFallback className="text-lg">
                {userName.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold truncate">{userName}</h3>
              {userEmail && (
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {userEmail}
                </p>
              )}
            </div>
          </div>

          {/* 账号信息 */}
          {userCode && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">账号</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">{userCode}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyCode}
                    className="h-6 w-6 p-0"
                    title={copied ? "已复制!" : "复制账号"}
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
