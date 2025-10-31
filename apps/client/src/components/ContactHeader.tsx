import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { UserPlus, Bell, Search } from "lucide-react";
import { useDialogStore } from "@/stores/dialog";
import { useFriendRequests } from "@/queries/friends";

interface ContactHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ContactHeader({
  searchQuery,
  onSearchChange,
}: ContactHeaderProps) {
  const { openDialog } = useDialogStore();
  const { data: friendRequests } = useFriendRequests();
  const pendingRequestsCount = friendRequests?.length || 0;

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索联系人..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => openDialog("addFriend")}
          className="w-10 h-10 p-0"
        >
          <UserPlus className="h-4 w-4" />
        </Button>
        {/* 铃鈴按钮始终显示，当有待处理请求时顯示彩章 */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => openDialog("friendRequests")}
          className="w-10 h-10 p-0 relative"
          title={
            pendingRequestsCount > 0
              ? `${pendingRequestsCount} 个待处理的好友请求`
              : "好友请求"
          }
        >
          <Bell className="h-4 w-4" />
          {pendingRequestsCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
            >
              {pendingRequestsCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
}
