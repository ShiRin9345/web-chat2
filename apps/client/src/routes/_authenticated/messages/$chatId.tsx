import { createFileRoute } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Phone,
  Video,
  MoreHorizontal,
} from "lucide-react";
import { useChatInfo } from "@/hooks/useChatInfo";
import { useMessages } from "@/hooks/useMessages";
import { useSendMessage } from "@/hooks/useSendMessage";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { MessageList } from "@/components/MessageList";
import { MessageInput } from "@/components/MessageInput";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/messages/$chatId")({
  component: ChatPage,
  validateSearch: (search: Record<string, unknown>) => {
    return search;
  },
});

function ChatPage() {
  const { chatId } = Route.useParams();
  const { chatInfo, handleVideoCall, handleAudioCall } = useChatInfo({
    chatId,
  });

  // 获取当前用户信息
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id || "";

  // 消息数据
  const {
    messages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
  } = useMessages(chatId);

  // 发送消息
  const { sendMessage, retryMessage } = useSendMessage(chatId, currentUserId);

  // 监听实时消息
  useRealtimeMessages(chatId, currentUserId);

  return (
    <div className="h-full flex flex-col">
      {/* 聊天头部 */}
      <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={chatInfo.avatar || undefined} />
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
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAudioCall}
            disabled={chatInfo.type !== "friend" || !chatInfo.isOnline}
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleVideoCall}
            disabled={chatInfo.type !== "friend" || !chatInfo.isOnline}
          >
            <Video className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 消息列表 */}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isLoading}
        fetchNextPage={fetchNextPage}
        onRetryMessage={retryMessage}
      />

      {/* 消息输入框 */}
      <MessageInput
        onSend={sendMessage}
        placeholder="输入消息..."
      />
    </div>
  );
}
