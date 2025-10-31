import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChatHeader } from "@/components/ChatHeader";
import { ChatMessages } from "@/components/ChatMessages";
import { MessageInput } from "@/components/MessageInput";
import { ChatSheet } from "@/components/ChatSheet";
import { useChatInfo } from "@/hooks/useChatInfo";
import { useSendMessage } from "@/hooks/useSendMessage";
import { useFileUpload } from "@/hooks/useFileUpload";
import { authClient } from "@/lib/auth-client";
import { DropProvider } from "@/providers/DropProvider";

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

  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isFriendInfoOpen, setIsFriendInfoOpen] = useState(false);
  const uploadState = useFileUpload({
    currentUserId,
    chatId,
  });

  return (
    <DropProvider uploadState={uploadState}>
      <div className="h-full flex flex-col">
        <ChatHeader
          chatInfo={chatInfo}
          onAudioCall={handleAudioCall}
          onVideoCall={handleVideoCall}
          onOpenInfo={() => {
            if (chatInfo.type === "group") {
              setIsGroupInfoOpen(true);
            } else if (chatInfo.type === "friend") {
              setIsFriendInfoOpen(true);
            }
          }}
        />
        <ChatMessages chatId={chatId} currentUserId={currentUserId} />
        <MessageInput onSend={sendMessage} uploadState={uploadState} />
        <ChatSheet
          chatInfo={chatInfo}
          isGroupInfoOpen={isGroupInfoOpen}
          isFriendInfoOpen={isFriendInfoOpen}
          setIsGroupInfoOpen={setIsGroupInfoOpen}
          setIsFriendInfoOpen={setIsFriendInfoOpen}
          currentUserId={currentUserId}
        />
      </div>
    </DropProvider>
  );
}
