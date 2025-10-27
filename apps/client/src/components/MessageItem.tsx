import { memo } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";
import type { MessageWithSender } from "@/queries/messages";
import { format, isToday, isYesterday } from "date-fns";
import { zhCN } from "date-fns/locale";

interface MessageItemProps {
  message: MessageWithSender & { _failed?: boolean; _error?: string };
  isOwn: boolean;
  showAvatar?: boolean;
  onRetry?: (message: MessageWithSender) => void;
}

function formatMessageTime(date: Date) {
  if (isToday(date)) {
    return format(date, "HH:mm", { locale: zhCN });
  }
  if (isYesterday(date)) {
    return `昨天 ${format(date, "HH:mm", { locale: zhCN })}`;
  }
  return format(date, "MM-dd HH:mm", { locale: zhCN });
}

export const MessageItem = memo(function MessageItem({
  message,
  isOwn,
  showAvatar = true,
  onRetry,
}: MessageItemProps) {
  const { content, sender, createdAt, type, _failed } = message;

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-2 group",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* 头像 */}
      {showAvatar && (
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={sender.image || undefined} alt={sender.name} />
          <AvatarFallback>{sender.name?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
      )}

      {/* 消息内容 */}
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[70%]",
          isOwn ? "items-end" : "items-start"
        )}
      >
        {/* 发送者名称（非自己的消息） */}
        {!isOwn && showAvatar && (
          <span className="text-xs text-muted-foreground px-2">
            {sender.name}
          </span>
        )}

        {/* 消息气泡 */}
        <div
          className={cn(
            "relative rounded-lg px-4 py-2 break-words",
            isOwn
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
            _failed && "opacity-50 border border-destructive"
          )}
        >
          {type === "text" && <p className="text-sm">{content}</p>}

          {type === "image" && (
            <img
              src={content}
              alt="图片消息"
              className="max-w-full rounded"
              loading="lazy"
            />
          )}

          {type === "file" && (
            <a
              href={content}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline"
            >
              📎 文件
            </a>
          )}

          {/* 失败标识 */}
          {_failed && (
            <div className="mt-1 text-xs text-destructive">
              发送失败
              {onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(message)}
                  className="ml-2 underline hover:no-underline"
                >
                  重试
                </button>
              )}
            </div>
          )}
        </div>

        {/* 时间戳 */}
        <span className="text-xs text-muted-foreground px-2">
          {createdAt ? formatMessageTime(new Date(createdAt)) : ""}
        </span>
      </div>

      {/* 占位符（保持布局对齐） */}
      {!showAvatar && <div className="h-10 w-10 flex-shrink-0" />}
    </div>
  );
});
