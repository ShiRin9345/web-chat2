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
import { Users, Crown, UserPlus, LogOut, Loader2, Shield } from "lucide-react";
import { useGroupMembers } from "@/queries/groups";

interface GroupInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  groupAvatar: string | null;
}

export function GroupInfoSheet({
  open,
  onOpenChange,
  groupId,
  groupName,
  groupAvatar,
}: GroupInfoSheetProps) {
  const { data: members, isLoading } = useGroupMembers(groupId);

  // 区分管理员和普通成员
  const admins = members?.filter((m) => m.role === "admin") || [];
  const regularMembers = members?.filter((m) => m.role === "member") || [];
  const totalMembers = members?.length || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>群聊信息</SheetTitle>
          <SheetDescription>{totalMembers} 名成员</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
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
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors cursor-pointer"
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
                    </div>
                  ))}

                  {/* 普通成员 */}
                  {regularMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors cursor-pointer"
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <Separator />

        {/* 底部操作栏 */}
        <div className="p-4">
          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            size="sm"
          >
            <LogOut className="h-4 w-4 mr-2" />
            退出群聊
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
