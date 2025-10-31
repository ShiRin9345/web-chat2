import { Link } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { OnlineStatusIndicator } from "@/components/OnlineStatusIndicator";

interface Conversation {
  id: string;
  name: string;
  avatar: string | null;
  type: "friend" | "group";
  lastMessage: string;
  time: string;
  unreadCount: number;
}

interface ConversationItemProps {
  conversation: Conversation;
}

export function ConversationItem({ conversation }: ConversationItemProps) {
  return (
    <Link
      key={conversation.id}
      to="/messages/$chatId"
      params={{ chatId: conversation.id }}
      className="block p-3 rounded-lg hover:bg-accent transition-colors"
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage src={conversation.avatar || undefined} />
            <AvatarFallback>{conversation.name.charAt(0)}</AvatarFallback>
          </Avatar>
          {conversation.type === "friend" && (
            <OnlineStatusIndicator
              userId={conversation.id.replace("friend-", "")}
              className="absolute -bottom-0.5 -right-0.5"
            />
          )}
        </div>

        <div className="flex-1 flex min-w-0">
          <div className="flex flex-col items-start justify-between flex-1 min-w-0">
            <h3 className="text-sm font-medium line-clamp-1 w-full">
              {conversation.name}
            </h3>
            <span className="text-xs text-muted-foreground w-full line-clamp-1">
              {conversation.lastMessage}
            </span>
          </div>

          <div className="flex flex-col items-center justify-between mt-1 ml-auto">
            <p className="text-xs text-muted-foreground">{conversation.time}</p>
            {conversation.unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {conversation.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
