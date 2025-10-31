import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Phone, Video, MoreHorizontal } from "lucide-react";

interface ChatInfo {
  type: "friend" | "group" | "unknown";
  id: string;
  name: string;
  avatar: string | null;
  isOnline: boolean;
  creatorId?: string; // 群主 ID（仅群聊）
  email?: string | null; // 好友邮箱（仅好友）
  code?: string | null; // 好友账号（仅好友）
}

interface ChatHeaderProps {
  chatInfo: ChatInfo;
  onAudioCall: () => void;
  onVideoCall: () => void;
  onOpenInfo: () => void;
}

export function ChatHeader({
  chatInfo,
  onAudioCall,
  onVideoCall,
  onOpenInfo,
}: ChatHeaderProps) {
  return (
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
          onClick={onAudioCall}
          disabled={chatInfo.type !== "friend" || !chatInfo.isOnline}
        >
          <Phone className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onVideoCall}
          disabled={chatInfo.type !== "friend" || !chatInfo.isOnline}
        >
          <Video className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onOpenInfo}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
