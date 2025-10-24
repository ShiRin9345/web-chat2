import { createFileRoute } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Search, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/groups")({
  component: GroupsPage,
});

function GroupsPage() {
  // 模拟群聊数据
  const groups = [
    {
      id: "1",
      name: "工作群",
      avatar: "",
      memberCount: 15,
      lastMessage: "王五: 今天的会议推迟到下午3点",
      lastMessageTime: "08:45",
      unreadCount: 5,
    },
    {
      id: "2",
      name: "同学群",
      avatar: "",
      memberCount: 8,
      lastMessage: "李四: 周末聚会别忘了",
      lastMessageTime: "昨天",
      unreadCount: 0,
    },
    {
      id: "3",
      name: "技术交流群",
      avatar: "",
      memberCount: 25,
      lastMessage: "张三: 有人知道这个bug怎么解决吗？",
      lastMessageTime: "2小时前",
      unreadCount: 12,
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* 顶部搜索栏 */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="搜索群聊..." className="pl-10" />
          </div>
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 群聊列表 */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={group.avatar} />
                  <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium truncate">
                      {group.name}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {group.lastMessageTime}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground truncate">
                      {group.lastMessage}
                    </p>
                    {group.unreadCount > 0 && (
                      <div className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {group.unreadCount}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-1">
                    {group.memberCount} 个成员
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
