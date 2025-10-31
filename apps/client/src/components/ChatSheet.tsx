import { GroupInfoSheet } from "@/components/GroupInfoSheet";
import { FriendInfoSheet } from "@/components/FriendInfoSheet";
import type { ChatInfo } from "@/hooks/useChatInfo";

interface ChatSheetProps {
  chatInfo: ChatInfo;
  isGroupInfoOpen: boolean;
  isFriendInfoOpen: boolean;
  setIsGroupInfoOpen: (open: boolean) => void;
  setIsFriendInfoOpen: (open: boolean) => void;
  currentUserId: string;
}

export function ChatSheet({
  chatInfo,
  isGroupInfoOpen,
  isFriendInfoOpen,
  setIsGroupInfoOpen,
  setIsFriendInfoOpen,
  currentUserId,
}: ChatSheetProps) {
  return (
    <>
      {chatInfo.type === "group" && (
        <GroupInfoSheet
          open={isGroupInfoOpen}
          onOpenChange={setIsGroupInfoOpen}
          groupId={chatInfo.id}
          groupName={chatInfo.name}
          groupAvatar={chatInfo.avatar}
          currentUserId={currentUserId}
          creatorId={chatInfo.creatorId || ""}
        />
      )}
      {chatInfo.type === "friend" && (
        <FriendInfoSheet
          open={isFriendInfoOpen}
          onOpenChange={setIsFriendInfoOpen}
          friendId={chatInfo.id}
          friendName={chatInfo.name}
          friendAvatar={chatInfo.avatar}
          friendEmail={chatInfo.email}
          friendCode={chatInfo.code}
        />
      )}
    </>
  );
}
