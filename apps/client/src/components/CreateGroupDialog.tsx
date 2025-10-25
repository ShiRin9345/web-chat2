import { useState } from "react";
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Loader2, Users, UserPlus } from "lucide-react";
import { useFriends } from "../queries/friends.ts";
import { useCreateGroup } from "../queries/groups.ts";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
}: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );

  const { data: friends, isLoading: isLoadingFriends } = useFriends();
  const createGroup = useCreateGroup();

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;

    try {
      await createGroup.mutateAsync({
        name: groupName.trim(),
        memberIds: Array.from(selectedMembers),
      });

      // 重置状态并关闭对话框
      setGroupName("");
      setSelectedMembers(new Set());
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create group:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>创建群聊</DialogTitle>
          <DialogDescription>创建一个新的群聊并邀请好友加入</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 群聊名称 */}
          <div className="space-y-2">
            <Label htmlFor="groupName">群聊名称</Label>
            <Input
              id="groupName"
              placeholder="输入群聊名称"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          {/* 选择成员 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>选择成员</Label>
              <Badge variant="secondary">{selectedMembers.size} 个成员</Badge>
            </div>

            <ScrollArea className="max-h-48">
              {isLoadingFriends ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : friends && friends.length > 0 ? (
                <div className="space-y-2">
                  {friends.map((friend: any) => (
                    <div
                      key={friend.id}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleMemberToggle(friend.id)}
                    >
                      <Checkbox
                        checked={selectedMembers.has(friend.id)}
                        onChange={() => handleMemberToggle(friend.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friend.image} />
                        <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {friend.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {friend.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无好友</p>
                  <p className="text-xs">先添加一些好友才能创建群聊</p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || createGroup.isPending}
              className="flex-1"
            >
              {createGroup.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              创建群聊
            </Button>
            <Button
              variant="outline"
              onClick={() => setCreateGroupDialog(false)}
            >
              取消
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
