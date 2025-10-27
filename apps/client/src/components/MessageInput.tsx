import { useState, useRef } from "react";
import type { KeyboardEvent, ChangeEvent } from "react";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd";
import { Send, Image as ImageIcon, Paperclip, X, Loader2 } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { formatFileSize } from "../utils/ossUpload";
import type { useFileUpload } from "../hooks/useFileUpload";

interface MessageInputProps {
  onSend: (content: string, type?: "text" | "image" | "file") => void;
  disabled?: boolean;
  placeholder?: string;
  currentUserId: string;
  uploadState: ReturnType<typeof useFileUpload>;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = "输入消息...",
  currentUserId,
  uploadState,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 使用传入的上传状态
  const {
    uploading,
    uploadingType,
    uploadProgress,
    uploadError,
    currentFile,
    handleFileUpload,
    cancelUpload,
    clearError,
  } = uploadState;

  const handleSend = () => {
    if (!content.trim() || disabled || uploading) return;

    onSend(content, "text");
    setContent("");
  };

  // 处理图片选择
  const handleImageSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await handleFileUpload(file, "image");

    // 重置input,允许重复上传同一文件
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  // 处理文件选择
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await handleFileUpload(file, "file");

    // 重置input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送，Ctrl/Cmd + Enter 换行
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Ctrl/Cmd + Enter 或 Shift + Enter 允许换行（默认行为）
  };

  return (
    <div className="border-t p-4">
      {/* 上传进度条 */}
      {uploading && currentFile && (
        <div className="mb-3 p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(currentFile.size)}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6 ml-2"
              onClick={cancelUpload}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="w-full bg-background rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            上传中 {uploadProgress}%
          </p>
        </div>
      )}

      {/* 上传错误提示 */}
      {uploadError && (
        <div className="mb-3 p-3 bg-destructive/10 text-destructive rounded-lg flex items-center justify-between">
          <p className="text-sm">{uploadError}</p>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={clearError}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="flex gap-2 items-end">
        {/* 附件按钮 */}
        <div className="flex gap-1">
          {/* 图片上传 */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled || uploading}
            className="h-9 w-9"
            title="发送图片"
            onClick={() => imageInputRef.current?.click()}
          >
            {uploading && uploadingType === "image" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
          </Button>

          {/* 文件上传 */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled || uploading}
            className="h-9 w-9"
            title="发送文件"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading && uploadingType === "file" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
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
          disabled={disabled || !content.trim() || uploading}
          className="h-9 w-9"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Kbd>Enter</Kbd>
          <span>发送消息</span>
        </div>
        <span>·</span>
        <div className="flex items-center gap-1.5">
          <KbdGroup>
            <Kbd>Ctrl</Kbd>
            <span>+</span>
            <Kbd>Enter</Kbd>
          </KbdGroup>
          <span>换行</span>
        </div>
      </div>
    </div>
  );
}
