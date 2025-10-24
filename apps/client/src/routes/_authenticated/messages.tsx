import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Search, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  // 模拟数据
  const conversations = [
    {
      id: "1",
      name: "张三",
      avatar: "",
      lastMessage: "你好，最近怎么样？",
      time: "10:30",
      unreadCount: 2,
      isOnline: true,
    },
    {
      id: "2",
      name: "李四",
      avatar: "",
      lastMessage: "明天见！",
      time: "09:15",
      unreadCount: 0,
      isOnline: false,
    },
    {
      id: "3",
      name: "工作群",
      avatar: "",
      lastMessage: "王五: 今天的会议推迟到下午3点",
      time: "08:45",
      unreadCount: 5,
      isOnline: true,
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* 顶部搜索栏 */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="搜索会话..." className="pl-10" />
          </div>
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 会话列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              to="/messages/$chatId"
              params={{ chatId: conversation.id }}
              className="block p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.avatar} />
                    <AvatarFallback>
                      {conversation.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.isOnline && (
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium truncate">
                      {conversation.name}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {conversation.time}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground truncate">
                      {conversation.lastMessage}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
