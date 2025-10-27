import { memo } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { ImageZoom } from "@workspace/ui/components/image-zoom";
import { cn } from "@workspace/ui/lib/utils";
import type { MessageWithSender } from "@/queries/messages";
import type { TempMessage } from "@/queries/messages";
import {
  CheckIcon,
  CheckCheckIcon,
  ClockIcon,
  AlertCircleIcon,
} from "lucide-react";

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
        "flex gap-3 items-start",
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* 头像 - 双方都显示 */}
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={message.sender.image || undefined} />
        <AvatarFallback>
          {message.sender.name?.[0]?.toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>

      {/* 消息内容区域 */}
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[70%]",
          isOwnMessage ? "items-end" : "items-start"
        )}
      >
        {/* 1. 时间戳 */}
        <span className="text-xs text-muted-foreground">
          {formatTime(message.createdAt)}
        </span>

        {/* 2. 发送者名称 */}
        <span className="text-xs font-medium text-foreground">
          {message.sender.name}
        </span>

        {/* 3. 消息气泡容器 */}
        <div
          className={cn(
            "flex items-end gap-2 w-full",
            isOwnMessage ? "justify-end" : "justify-start"
          )}
        >
          {/* 消息状态指示器 - 只有自己的消息显示，放在消息左边 */}
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

          <div
            className={cn(
              "break-words",
              // 图片和文件消息不需要背景和内边距
              message.type === "image" || message.type === "file"
                ? ""
                : "rounded-2xl px-4 py-2",
              message.type === "text" &&
                (isOwnMessage
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted rounded-tl-sm")
            )}
          >
            {renderMessageContent(message, isOwnMessage)}
          </div>
        </div>
      </div>
    </div>
  );
});

// 渲染消息内容（根据类型）
function renderMessageContent(
  message: MessageWithSender | TempMessage,
  isOwnMessage: boolean
) {
  switch (message.type) {
    case "text":
      return <p className="whitespace-pre-wrap">{message.content}</p>;

    case "image":
      return (
        <div className="max-w-xs">
          <ImageZoom>
            <img
              src={message.content}
              alt="图片消息"
              className={cn(
                "rounded-xl shadow-md max-h-80 object-cover w-full",
                isOwnMessage ? "rounded-tr-sm" : "rounded-tl-sm"
              )}
            />
          </ImageZoom>
        </div>
      );

    case "file":
      // 简单的文件显示（可以后续增强）
      try {
        const fileInfo = JSON.parse(message.content);

        // 处理文件下载，解决跨域文件名问题
        const handleDownload = async () => {
          try {
            const response = await fetch(fileInfo.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileInfo.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          } catch (error) {
            console.error("文件下载失败:", error);
            // 降级方案：直接打开链接
            window.open(fileInfo.url, "_blank");
          }
        };

        return (
          <div
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl shadow-md min-w-[280px]",
              isOwnMessage
                ? "bg-primary/10 rounded-tr-sm"
                : "bg-muted/80 rounded-tl-sm"
            )}
          >
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">
                {fileInfo.name?.split(".").pop()?.toUpperCase() || "FILE"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileInfo.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatFileSize(fileInfo.size)}
              </p>
            </div>
            <button
              onClick={handleDownload}
              className="text-xs text-primary hover:text-primary/80 font-medium px-3 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors flex-shrink-0"
            >
              下载
            </button>
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
