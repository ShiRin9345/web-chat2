import { useState } from "react";
import { useDebounce } from "use-debounce";
import type { User } from "@workspace/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Loader2, Search, UserPlus, CheckCircle } from "lucide-react";
import {
  useSearchUsers,
  useSendFriendRequest,
  useFriends,
} from "@/queries/friends";

interface AddFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFriendDialog({ open, onOpenChange }: AddFriendDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");

  // 使用防抖，延迟 500ms
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);

  const { data: searchResults, isLoading: isSearching } =
    useSearchUsers(debouncedSearchQuery);
  const { data: friends } = useFriends(); // 获取当前用户的好友列表
  const sendFriendRequest = useSendFriendRequest();

  // 检查用户是否已经是好友
  const isAlreadyFriend = (userId: string) => {
    return friends?.some((friend) => friend.id === userId) || false;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // 搜索现在通过防抖自动触发，这里可以添加其他逻辑
  };

  const handleSendRequest = async () => {
    if (!selectedUser) return;

    try {
      await sendFriendRequest.mutateAsync({
        toUserId: selectedUser.id,
        message: message.trim() || undefined,
      });

      // 重置状态并关闭对话框
      setSelectedUser(null);
      setMessage("");
      setSearchQuery("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to send friend request:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加好友</DialogTitle>
          <DialogDescription>
            通过邮箱或用户 ID 搜索并添加好友
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 搜索表单 */}
          <form onSubmit={handleSearch} className="space-y-2">
            <Label htmlFor="search">搜索用户</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="输入邮箱或用户 ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={!searchQuery.trim()}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>

          {/* 搜索结果 */}
          {debouncedSearchQuery &&
            searchResults &&
            searchResults.length > 0 && (
              <div className="space-y-2">
                <Label>搜索结果</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {searchResults.map((user: User) => {
                    const isFriend = isAlreadyFriend(user.id);
                    return (
                      <div
                        key={user.id}
                        className={`flex items-center space-x-3 p-2 rounded-lg border transition-colors ${
                          isFriend
                            ? "bg-muted/30 border-muted cursor-not-allowed opacity-60"
                            : selectedUser?.id === user.id
                            ? "bg-primary/10 border-primary cursor-pointer"
                            : "hover:bg-muted cursor-pointer"
                        }`}
                        onClick={() => !isFriend && setSelectedUser(user)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.image || undefined} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            账号: {user.code} · {user.email}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isFriend ? (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              已是好友
                            </Badge>
                          ) : selectedUser?.id === user.id ? (
                            <Badge variant="default" className="text-xs">
                              已选择
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* 选择用户后的操作 */}
          {selectedUser && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.image || undefined} />
                  <AvatarFallback>{selectedUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedUser.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.email}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">附加消息（可选）</Label>
                <Textarea
                  id="message"
                  placeholder="发送好友申请时附加的消息..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSendRequest}
                  disabled={
                    sendFriendRequest.isPending ||
                    isAlreadyFriend(selectedUser.id)
                  }
                  className="flex-1"
                >
                  {sendFriendRequest.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : isAlreadyFriend(selectedUser.id) ? (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {isAlreadyFriend(selectedUser.id)
                    ? "已是好友"
                    : "发送好友申请"}
                </Button>
                <Button variant="outline" onClick={() => setSelectedUser(null)}>
                  取消
                </Button>
              </div>
            </div>
          )}

          {/* 无搜索结果 */}
          {debouncedSearchQuery &&
            searchResults &&
            searchResults.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <p>未找到用户</p>
                <p className="text-xs">请检查邮箱或用户 ID 是否正确</p>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
