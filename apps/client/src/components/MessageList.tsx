import { memo } from "react";
import type { MessageWithSender } from "@/queries/messages";
import { MessageItem } from "./MessageItem";

interface MessageListProps {
  messages: MessageWithSender[];
  currentUserId: string;
}

export const MessageList = memo(function MessageList({
  messages,
  currentUserId,
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p className="text-lg">暂无消息</p>
        <p className="text-sm mt-2">开始聊天吧！</p>
      </div>
    );
  }

  // 按日期分组消息（可选功能）
  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="space-y-4">
      {groupedMessages.map((group) => (
        <div key={group.date} className="space-y-2">
          {/* 日期分隔符 */}
          <div className="flex justify-center">
            <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
              {group.dateLabel}
            </div>
          </div>

          {/* 消息列表 */}
          {group.messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isOwnMessage={message.senderId === currentUserId}
            />
          ))}
        </div>
      ))}
    </div>
  );
});

// 辅助函数：按日期分组消息
function groupMessagesByDate(messages: MessageWithSender[]): {
  date: string;
  dateLabel: string;
  messages: MessageWithSender[];
}[] {
  const groups: Map<
    string,
    { date: string; dateLabel: string; messages: MessageWithSender[] }
  > = new Map();

  for (const message of messages) {
    const date = new Date(message.createdAt);
    const dateKey = date.toDateString();

    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        date: dateKey,
        dateLabel: formatDateLabel(date),
        messages: [],
      });
    }

    groups.get(dateKey)!.messages.push(message);
  }

  return Array.from(groups.values());
}

// 辅助函数：格式化日期标签
function formatDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "今天";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "昨天";
  }

  // 如果是今年，只显示月日
  if (date.getFullYear() === today.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  // 其他情况显示完整日期
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}
