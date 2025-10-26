import { useState, useRef } from "react";
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Loader2, Users, UserPlus, Camera } from "lucide-react";
import { useFriends } from "@/queries/friends";
import { useCreateGroup } from "@/queries/groups";
import uploadAvatarToOSS from "@/utils/uploadAvatar";

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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith("image/")) {
        alert("请选择图片文件");
        return;
      }

      // 验证文件大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("图片大小不能超过 5MB");
        return;
      }

      setAvatarFile(file);

      // 创建预览 URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert("请输入群聊名称");
      return;
    }

    if (!avatarFile) {
      alert("请上传群头像");
      return;
    }

    try {
      // 先上传头像到 OSS
      setIsUploading(true);
      const avatarUrl = await uploadAvatarToOSS(avatarFile);
      setIsUploading(false);

      // 创建群聊
      await createGroup.mutateAsync({
        name: groupName.trim(),
        avatar: avatarUrl,
        memberIds: Array.from(selectedMembers),
      });

      // 重置状态并关闭对话框
      setGroupName("");
      setSelectedMembers(new Set());
      setAvatarFile(null);
      setPreviewUrl(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create group:", error);
      alert("创建群聊失败，请重试");
    } finally {
      setIsUploading(false);
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
          {/* 群头像上传 */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar
                className="h-24 w-24 cursor-pointer"
                onClick={handleAvatarClick}
              >
                <AvatarImage src={previewUrl || undefined} />
                <AvatarFallback className="text-2xl">
                  {groupName.charAt(0) || "G"}
                </AvatarFallback>
              </Avatar>

              {/* 上传按钮 */}
              <Button
                size="sm"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                variant="secondary"
                onClick={handleAvatarClick}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {isUploading
                ? "上传中..."
                : avatarFile
                ? "点击更换群头像"
                : "点击上传群头像（必填）"}
            </p>

            {/* 隐藏的文件输入 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

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
                  {friends.map((friend: User) => (
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
                        <AvatarImage src={friend.image || undefined} />
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
              disabled={
                !groupName.trim() ||
                !avatarFile ||
                isUploading ||
                createGroup.isPending
              }
              className="flex-1"
            >
              {isUploading || createGroup.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              {isUploading ? "上传中..." : "创建群聊"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading || createGroup.isPending}
            >
              取消
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
