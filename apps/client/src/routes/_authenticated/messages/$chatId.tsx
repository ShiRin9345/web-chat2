import { createFileRoute } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Send, Phone, Video, MoreHorizontal } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages/$chatId")({
  component: ChatPage,
  validateSearch: (search: Record<string, unknown>) => {
    return search;
  },
  beforeLoad: async ({ params }) => {
    console.log("Loading chat with ID:", params.chatId);
    return {};
  },
});

function ChatPage() {
  const { chatId } = Route.useParams();
  console.log("ChatPage rendered with chatId:", chatId);

  // 模拟聊天数据
  const messages = [
    {
      id: "1",
      senderId: "other",
      content: "你好！",
      timestamp: "10:25",
      isRead: true,
    },
    {
      id: "2",
      senderId: "me",
      content: "你好，最近怎么样？",
      timestamp: "10:26",
      isRead: true,
    },
    {
      id: "3",
      senderId: "other",
      content: "还不错，工作有点忙。你呢？",
      timestamp: "10:28",
      isRead: true,
    },
    {
      id: "4",
      senderId: "me",
      content: "我也挺忙的，不过还好。周末有空一起吃饭吗？",
      timestamp: "10:30",
      isRead: false,
    },
  ];

  const chatInfo = {
    name: "张三",
    avatar: "",
    isOnline: true,
  };

  return (
    <div className="h-full flex flex-col">
      {/* 聊天头部 */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={chatInfo.avatar} />
              <AvatarFallback>{chatInfo.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {chatInfo.isOnline && (
              <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
          <div>
            <h2 className="font-semibold">{chatInfo.name}</h2>
            <p className="text-sm text-muted-foreground">
              {chatInfo.isOnline ? "在线" : "离线"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button size="sm" variant="ghost">
            <Phone className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost">
            <Video className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 消息区域 */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === "me" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex items-end space-x-2 max-w-[70%] ${
                  message.senderId === "me"
                    ? "flex-row-reverse space-x-reverse"
                    : ""
                }`}
              >
                {message.senderId === "other" && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={chatInfo.avatar} />
                    <AvatarFallback>{chatInfo.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`rounded-lg px-3 py-2 ${
                    message.senderId === "me"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <div
                    className={`flex items-center mt-1 ${
                      message.senderId === "me"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <span className="text-xs opacity-70">
                      {message.timestamp}
                    </span>
                    {message.senderId === "me" && (
                      <span className="ml-1 text-xs opacity-70">
                        {message.isRead ? "已读" : "未读"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* 消息输入区域 */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <Input placeholder="输入消息..." className="flex-1" />
          <Button size="sm">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
