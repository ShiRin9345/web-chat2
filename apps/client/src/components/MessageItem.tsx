import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";
import type { MessageWithSender } from "@/queries/messages";
import type { TempMessage } from "@/queries/messages";
import { CheckIcon, CheckCheckIcon, ClockIcon, AlertCircleIcon } from "lucide-react";

interface MessageItemProps {
  message: MessageWithSender | TempMessage;
  isOwnMessage: boolean;
}

export const MessageItem = memo(function MessageItem({
  message,
  isOwnMessage,
}: MessageItemProps) {
  const isPending = "isPending" in message && message.isPending;
  const isFailed = "isFailed" in message && message.isFailed;

  return (
    <div
      className={cn(
        "flex gap-2 items-end",
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* 头像 - 只有对方消息显示 */}
      {!isOwnMessage && (
        <Avatar className="w-8 h-8">
          <AvatarImage src={message.sender.image || undefined} />
          <AvatarFallback>
            {message.sender.name?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      )}

      {/* 消息内容 */}
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[70%]",
          isOwnMessage ? "items-end" : "items-start"
        )}
      >
        {/* 发送者名称 - 只有对方消息显示 */}
        {!isOwnMessage && (
          <span className="text-xs text-muted-foreground px-3">
            {message.sender.name}
          </span>
        )}

        {/* 消息气泡 */}
        <div className="flex items-end gap-2">
          <div
            className={cn(
              "rounded-2xl px-4 py-2 break-words",
              isOwnMessage
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted rounded-bl-sm"
            )}
          >
            {renderMessageContent(message)}
          </div>

          {/* 消息状态指示器 - 只有自己的消息显示 */}
          {isOwnMessage && (
            <div className="flex items-center mb-1">
              {isPending && (
                <ClockIcon className="w-3 h-3 text-muted-foreground animate-pulse" />
              )}
              {isFailed && (
                <AlertCircleIcon className="w-3 h-3 text-destructive" />
              )}
              {!isPending && !isFailed && message.isRead && (
                <CheckCheckIcon className="w-3 h-3 text-primary" />
              )}
              {!isPending && !isFailed && !message.isRead && (
                <CheckIcon className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
          )}
        </div>

        {/* 时间戳 */}
        <span className="text-xs text-muted-foreground px-3">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
});

// 渲染消息内容（根据类型）
function renderMessageContent(message: MessageWithSender | TempMessage) {
  switch (message.type) {
    case "text":
      return <p className="whitespace-pre-wrap">{message.content}</p>;

    case "image":
      return (
        <div className="max-w-xs">
          <img
            src={message.content}
            alt="图片消息"
            className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => {
              // TODO: 实现图片预览功能
              window.open(message.content, "_blank");
            }}
          />
        </div>
      );

    case "file":
      // 简单的文件显示（可以后续增强）
      try {
        const fileInfo = JSON.parse(message.content);
        return (
          <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
            <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
              <span className="text-xs font-mono">
                {fileInfo.name?.split(".").pop()?.toUpperCase() || "FILE"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileInfo.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(fileInfo.size)}
              </p>
            </div>
            <a
              href={fileInfo.url}
              download={fileInfo.name}
              className="text-xs text-primary hover:underline"
            >
              下载
            </a>
          </div>
        );
      } catch {
        return <p className="text-sm">文件消息</p>;
      }

    default:
      return <p>{message.content}</p>;
  }
}

// 格式化时间
function formatTime(timestamp: Date | string): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
