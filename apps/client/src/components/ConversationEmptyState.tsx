import { MessageSquare } from "lucide-react";

export function ConversationEmptyState() {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p className="text-lg font-medium">暂无会话</p>
      <p className="text-sm mt-2">添加好友或创建群聊开始聊天</p>
    </div>
  );
}
