import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Send, Image as ImageIcon, Paperclip } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface MessageInputProps {
  onSend: (content: string, type?: "text" | "image" | "file") => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = "输入消息...",
}: MessageInputProps) {
  const [content, setContent] = useState("");

  const handleSend = () => {
    if (!content.trim() || disabled) return;

    onSend(content, "text");
    setContent("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter 发送
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t p-4">
      <div className="flex gap-2 items-end">
        {/* 附件按钮 */}
        <div className="flex gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled}
            className="h-9 w-9"
            title="发送图片"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled}
            className="h-9 w-9"
            title="发送文件"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </div>

        {/* 输入框 */}
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex-1 min-h-[40px] max-h-[120px] resize-none",
            "focus-visible:ring-1"
          )}
          rows={1}
        />

        {/* 发送按钮 */}
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={disabled || !content.trim()}
          className="h-9 w-9"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Ctrl/Cmd + Enter 发送消息
      </p>
    </div>
  );
}
