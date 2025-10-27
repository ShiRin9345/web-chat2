import { useState, useRef, type KeyboardEvent } from "react";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Send, Image, Paperclip } from "lucide-react";

interface MessageInputProps {
  onSend: (content: string, type?: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * 消息输入框组件
 * 支持文本输入、图片粘贴、文件拖拽
 */
export function MessageInput({
  onSend,
  disabled = false,
  placeholder = "输入消息...",
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!message.trim() || disabled) return;

    onSend(message.trim(), "text");
    setMessage("");

    // 重置输入框高度
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Command + Enter 发送消息
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
    // Enter 发送消息（Shift + Enter 换行）
    else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // 检查是否为图片
      if (item?.type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = item?.getAsFile();

        if (file) {
          // TODO: 上传图片并发送
          console.log("Pasted image:", file);
          // 这里应该调用图片上传服务，然后发送图片URL
        }
      }
    }
  };

  const handleImageClick = () => {
    // TODO: 打开图片选择器
    console.log("Open image picker");
  };

  const handleFileClick = () => {
    // TODO: 打开文件选择器
    console.log("Open file picker");
  };

  return (
    <div className="border-t bg-background p-4">
      <div className="flex items-end gap-2">
        {/* 附加功能按钮 */}
        <div className="flex gap-1 mb-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleImageClick}
            disabled={disabled}
            aria-label="发送图片"
          >
            <Image className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleFileClick}
            disabled={disabled}
            aria-label="发送文件"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </div>

        {/* 输入框 */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[40px] max-h-[120px] resize-none flex-1"
          rows={1}
        />

        {/* 发送按钮 */}
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="h-10 w-10 flex-shrink-0"
          aria-label="发送消息"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* 提示文本 */}
      <p className="text-xs text-muted-foreground mt-2">
        按 Enter 发送，Shift + Enter 换行
      </p>
    </div>
  );
}
