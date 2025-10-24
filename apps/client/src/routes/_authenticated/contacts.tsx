import { createFileRoute } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Search, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/contacts")({
  component: ContactsPage,
});

function ContactsPage() {
  const contacts = [
    {
      id: "1",
      name: "张三",
      avatar: "",
      status: "在线",
      isOnline: true,
      lastSeen: "刚刚",
    },
    {
      id: "2",
      name: "李四",
      avatar: "",
      status: "离线",
      isOnline: false,
      lastSeen: "2小时前",
    },
    {
      id: "3",
      name: "王五",
      avatar: "",
      status: "忙碌",
      isOnline: true,
      lastSeen: "1小时前",
    },
  ];

  const groups = [
    {
      id: "1",
      name: "工作群",
      avatar: "",
      memberCount: 15,
    },
    {
      id: "2",
      name: "同学群",
      avatar: "",
      memberCount: 8,
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* 顶部搜索栏 */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="搜索联系人..." className="pl-10" />
          </div>
          <Button size="sm" variant="outline">
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* 我的好友 */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              我的好友 ({contacts.length})
            </h3>
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contact.avatar} />
                      <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {contact.isOnline && (
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium truncate">
                        {contact.name}
                      </h4>
                      <Badge
                        variant={contact.isOnline ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {contact.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {contact.isOnline
                        ? "在线"
                        : `最后活跃: ${contact.lastSeen}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 我的群聊 */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              我的群聊 ({groups.length})
            </h3>
            <div className="space-y-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={group.avatar} />
                    <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">
                      {group.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {group.memberCount} 个成员
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
