import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Phone, Video, MoreHorizontal } from "lucide-react";
import { useChatInfo } from "@/hooks/useChatInfo";
import { ChatMessages } from "@/components/ChatMessages";
import { MessageInput } from "@/components/MessageInput";
import { GroupInfoSheet } from "@/components/GroupInfoSheet";
import { useSendMessage } from "@/hooks/useSendMessage";
import { useFileUpload } from "@/hooks/useFileUpload";
import { authClient } from "@/lib/auth-client";
import { DropProvider } from "@/providers/DropProvider";

export const Route = createFileRoute("/_authenticated/messages/$chatId")({
  component: ChatPage,
  validateSearch: (search: Record<string, unknown>) => {
    return search;
  },
  // 移除 loader，因为 useChatInfo 现在会优先从 friends 缓存中获取数据
});

function ChatPage() {
  const { chatId } = Route.useParams();
  const { chatInfo, handleVideoCall, handleAudioCall } = useChatInfo({
    chatId,
  });
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id || "";
  const currentUserName = session?.user?.name || "我";
  const currentUserImage = session?.user?.image || null;
  const { sendMessage } = useSendMessage(
    chatId,
    currentUserId,
    currentUserName,
    currentUserImage
  );

  // 群信息 Sheet 状态
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  // 文件上传状态和方法，在 MessageInput 和 DropProvider 之间共享
  const uploadState = useFileUpload({
    currentUserId,
    chatId, // 传递 chatId
    // onSuccess 不再需要，因为后端会自动保存消息
  });

  return (
    <DropProvider
      chatId={chatId}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      currentUserImage={currentUserImage}
      uploadState={uploadState}
    >
      <div className="h-full flex flex-col">
        {/* 聊天头部 */}
        <div className="p-4 border-b flex items-center justify-between">
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
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (chatInfo.type === "group") {
                  setIsGroupInfoOpen(true);
                }
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 消息列表 */}
        <ChatMessages chatId={chatId} currentUserId={currentUserId} />

        {/* 消息输入 */}
        <MessageInput
          onSend={sendMessage}
          currentUserId={currentUserId}
          uploadState={uploadState}
        />

        {/* 群信息 Sheet */}
        {chatInfo.type === "group" && (
          <GroupInfoSheet
            open={isGroupInfoOpen}
            onOpenChange={setIsGroupInfoOpen}
            groupId={chatInfo.id}
            groupName={chatInfo.name}
            groupAvatar={chatInfo.avatar}
            currentUserId={currentUserId}
          />
        )}
      </div>
    </DropProvider>
  );
}
