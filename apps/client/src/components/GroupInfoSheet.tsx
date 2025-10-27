import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@workspace/ui/components/sheet";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Users,
  Crown,
  UserPlus,
  LogOut,
  Loader2,
  Shield,
  MoreVertical,
  UserMinus,
  UserCog,
} from "lucide-react";
import {
  useGroupMembers,
  useLeaveGroup,
  useChangeMemberRole,
  useRemoveMember,
} from "@/queries/groups";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSocket } from "@/providers/SocketProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

interface GroupInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  groupAvatar: string | null;
  currentUserId: string;
  creatorId: string; // 群主 ID
}

export function GroupInfoSheet({
  open,
  onOpenChange,
  groupId,
  groupName,
  groupAvatar,
  currentUserId,
  creatorId,
}: GroupInfoSheetProps) {
  const { data: members, isLoading } = useGroupMembers(groupId);
  const leaveGroup = useLeaveGroup();
  const changeMemberRole = useChangeMemberRole();
  const removeMember = useRemoveMember();
  const navigate = useNavigate();
  const socket = useSocket();
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  // 区分管理员和普通成员
  const admins = members?.filter((m) => m.role === "admin") || [];
  const regularMembers = members?.filter((m) => m.role === "member") || [];
  const totalMembers = members?.length || 0;

  // 判断当前用户的角色
  const currentUserMember = members?.find((m) => m.id === currentUserId);
  const isAdmin = currentUserMember?.role === "admin";
  const isCreator = creatorId === currentUserId;
  const canLeave = !isAdmin; // 普通成员可以退出，管理员不能

  // 调试信息
  console.log("GroupInfoSheet Debug:", {
    currentUserId,
    currentUserMember,
    isAdmin,
    canLeave,
    allMembers: members,
  });

  // 退出群聊处理
  const handleLeaveGroup = async () => {
    try {
      await leaveGroup.mutateAsync(groupId);
      // 通知 Socket 离开群聊房间
      socket.emit("group:leave", { groupId });
      // 关闭弹窗
      setShowLeaveDialog(false);
      onOpenChange(false);
      // 跳转到消息页面
      navigate({ to: "/messages" });
    } catch (error: any) {
      console.error("Failed to leave group:", error);
      alert(error.response?.data?.error || "退出群聊失败");
    }
  };

  // 修改成员角色
  const handleChangeRole = async (
    memberId: string,
    newRole: "admin" | "member"
  ) => {
    try {
      await changeMemberRole.mutateAsync({ groupId, memberId, role: newRole });
    } catch (error: any) {
      console.error("Failed to change role:", error);
      alert(error.response?.data?.error || "修改角色失败");
    }
  };

  // 踢出成员
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`确定要移除 "${memberName}" 吗？`)) {
      return;
    }

    try {
      await removeMember.mutateAsync({ groupId, memberId });
    } catch (error: any) {
      console.error("Failed to remove member:", error);
      alert(error.response?.data?.error || "移除成员失败");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>群聊信息</SheetTitle>
            <SheetDescription>{totalMembers} 名成员</SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-6 py-6 space-y-6">
              {/* 群头像和名称 */}
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24 border">
                  <AvatarImage src={groupAvatar || undefined} />
                  <AvatarFallback className="text-3xl">
                    {groupName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-1">{groupName}</h2>
                  <p className="text-sm text-muted-foreground">
                    ID: {groupId.slice(0, 8)}
                  </p>
                </div>
              </div>

              <Separator />
              {/* 快捷操作 */}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="w-full" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  邀请成员
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  查看全部
                </Button>
              </div>

              <Separator />

              {/* 成员列表 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    成员列表
                  </h3>
                  <Badge variant="secondary">{totalMembers}</Badge>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* 管理员 */}
                    {admins.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.image || undefined} />
                            <AvatarFallback className="text-sm">
                              {member.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5 bg-amber-500 rounded-full p-0.5">
                            <Crown className="h-2.5 w-2.5 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {member.name}
                            </p>
                            <Badge
                              variant="secondary"
                              className="h-5 px-1.5 text-xs"
                            >
                              <Shield className="h-2.5 w-2.5" />
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>

                        {/* 群主可以管理其他管理员 */}
                        {isCreator && member.id !== currentUserId && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleChangeRole(member.id, "member")
                                }
                              >
                                <UserCog className="h-4 w-4 mr-2" />
                                设为普通成员
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleRemoveMember(member.id, member.name)
                                }
                                className="text-destructive"
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                移除成员
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}

                    {/* 普通成员 */}
                    {regularMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.image || undefined} />
                          <AvatarFallback className="text-sm">
                            {member.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>

                        {/* 管理员可以管理普通成员 */}
                        {isAdmin && member.id !== currentUserId && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isCreator && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleChangeRole(member.id, "admin")
                                  }
                                >
                                  <UserCog className="h-4 w-4 mr-2" />
                                  设为管理员
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() =>
                                  handleRemoveMember(member.id, member.name)
                                }
                                className="text-destructive"
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                移除成员
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* 底部操作栏 - 只对普通成员显示 */}
          {canLeave && (
            <>
              <Separator />
              <div className="p-4">
                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  size="sm"
                  onClick={() => setShowLeaveDialog(true)}
                  disabled={leaveGroup.isPending}
                >
                  {leaveGroup.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4 mr-2" />
                  )}
                  退出群聊
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* 退出群聊确认对话框 */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>退出群聊</DialogTitle>
            <DialogDescription>
              确定要退出 "{groupName}" 吗？退出后将无法收到群消息。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLeaveDialog(false)}
              disabled={leaveGroup.isPending}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeaveGroup}
              disabled={leaveGroup.isPending}
            >
              {leaveGroup.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              确定退出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
