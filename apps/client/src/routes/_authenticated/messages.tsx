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
      name: "工作群sfdsfsdfsdf",
      avatar: "",
      lastMessage: "王五: 今天的会议推迟到下午3点",
      time: "08:45",
      unreadCount: 5,
      isOnline: true,
    },
  ];

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex gap-2 ">
        <Input placeholder="搜索会话..." className="pl-10" />
        <div className="flex justify-center w-10 h-10 border rounded-md items-center">
          <Plus className="" />
        </div>
      </div>

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

                <div className="flex-1 flex min-w-0">
                  <div className="flex flex-col items-start justify-between flex-1 min-w-0">
                    <h3 className="text-sm font-medium line-clamp-1 w-full">
                      {conversation.name}
                    </h3>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {conversation.lastMessage}
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-between mt-1 ml-auto">
                    <p className="text-xs text-muted-foreground">
                      {conversation.time}
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
