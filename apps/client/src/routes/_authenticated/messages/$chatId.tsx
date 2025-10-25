import { createFileRoute } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Send,
  Phone,
  Video,
  MoreHorizontal,
  MessageSquare,
} from "lucide-react";

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

  // 解析 chatId 获取类型和实际 ID
  const isGroup = chatId.startsWith("group-");
  const actualId = chatId.replace(/^(friend-|group-)/, "");

  // 暂时显示占位内容，不实现实际的消息功能
  const chatInfo = {
    name: isGroup ? "群聊" : "好友",
    avatar: "",
    isOnline: false,
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
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="w-8 h-8" />
            </div>
            <p className="text-lg font-medium">聊天功能开发中</p>
            <p className="text-sm mt-2">消息发送和接收功能暂未实现</p>
            <p className="text-xs mt-1">Chat ID: {chatId}</p>
          </div>
        </div>
      </ScrollArea>

      {/* 消息输入区域 - 暂时禁用 */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2 opacity-50">
          <Input placeholder="消息功能开发中..." className="flex-1" disabled />
          <Button size="sm" disabled>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
