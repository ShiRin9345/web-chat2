import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Loader2, Users, UserPlus } from "lucide-react";
import { useDialogStore } from "@/stores/dialog";
import type { Group } from "@workspace/database";

interface ContactGroupsProps {
  groups: Group[] | undefined;
  isLoading: boolean;
  onGroupClick: (groupId: string) => void;
  searchQuery: string;
}

export function ContactGroups({
  groups,
  isLoading,
  onGroupClick,
  searchQuery,
}: ContactGroupsProps) {
  const { openDialog } = useDialogStore();

  // 过滤群组
  const filteredGroups = groups?.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          我的群聊 ({filteredGroups?.length || 0})
        </h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => openDialog("createGroup")}
          className="h-6 px-2 text-xs"
        >
          <UserPlus className="h-3 w-3 mr-1" />
          创建群聊
        </Button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : filteredGroups && filteredGroups.length > 0 ? (
        <div className="space-y-2">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              onClick={() => onGroupClick(group.id)}
              className="block p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={group.avatar || undefined} />
                  <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">{group.name}</h4>
                  <p className="text-xs text-muted-foreground">群聊</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无群聊</p>
          <p className="text-xs">点击上方按钮创建群聊</p>
        </div>
      )}
    </div>
  );
}
