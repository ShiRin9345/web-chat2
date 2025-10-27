import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { UserMinus, Loader2, Copy, Check } from "lucide-react";
import { useRemoveFriend } from "@/queries/friends";

interface FriendInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friendId: string;
  friendName: string;
  friendAvatar: string | null;
  friendEmail?: string | null;
  friendCode?: string | null;
}

export function FriendInfoSheet({
  open,
  onOpenChange,
  friendId,
  friendName,
  friendAvatar,
  friendEmail,
  friendCode,
}: FriendInfoSheetProps) {
  const navigate = useNavigate();
  const removeFriend = useRemoveFriend();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (friendCode) {
      try {
        await navigator.clipboard.writeText(friendCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleRemoveFriend = async () => {
    try {
      await removeFriend.mutateAsync(friendId);
      setShowRemoveDialog(false);
      onOpenChange(false);
      // 删除好友后跳转到首页
      navigate({ to: "/" });
    } catch (error) {
      console.error("Failed to remove friend:", error);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>好友信息</SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-6 py-6 space-y-6">
              {/* 好友头像和名称 */}
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24 border">
                  <AvatarImage src={friendAvatar || undefined} />
                  <AvatarFallback className="text-3xl">
                    {friendName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-1">{friendName}</h2>
                  {friendEmail && (
                    <p className="text-sm text-muted-foreground">
                      {friendEmail}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* 账号信息 */}
              {friendCode && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    账号信息
                  </h3>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        账号
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{friendCode}</span>
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
                </div>
              )}
            </div>
          </ScrollArea>

          {/* 底部操作区 */}
          <Separator />
          <div className="p-4">
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              size="sm"
              onClick={() => setShowRemoveDialog(true)}
              disabled={removeFriend.isPending}
            >
              {removeFriend.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserMinus className="h-4 w-4 mr-2" />
              )}
              删除好友
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* 删除确认对话框 */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除好友</DialogTitle>
            <DialogDescription>
              你确定要删除好友"{friendName}"吗？
              <br />
              删除后将无法查看对方的在线状态，也无法再与对方聊天。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRemoveDialog(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveFriend}
              disabled={removeFriend.isPending}
            >
              {removeFriend.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
