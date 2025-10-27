import { createContext, useContext } from "react";
import { useDropzone } from "react-dropzone";
import { useSendMessage } from "@/hooks/useSendMessage";
import type { useFileUpload } from "@/hooks/useFileUpload";
import { Upload, ImageIcon, FileIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface DropContextValue {
  isDragActive: boolean;
}

const DropContext = createContext<DropContextValue>({
  isDragActive: false,
});

export const useDrop = () => useContext(DropContext);

interface DropProviderProps {
  children: React.ReactNode;
  chatId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserImage: string | null;
  uploadState: ReturnType<typeof useFileUpload>;
}

export function DropProvider({
  children,
  chatId,
  currentUserId,
  currentUserName,
  currentUserImage,
  uploadState,
}: DropProviderProps) {
  const { sendMessage } = useSendMessage(
    chatId,
    currentUserId,
    currentUserName,
    currentUserImage
  );

  // 使用传入的上传状态
  const { handleFileUpload } = uploadState;

  const onDrop = async (uploadFiles: File[]) => {
    if (uploadFiles.length === 0) return;

    // 上传每个文件
    for (const file of uploadFiles) {
      const isImage = file.type.startsWith("image/");
      const fileType = isImage ? "image" : "file";
      await handleFileUpload(file, fileType);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true, // 禁用点击上传，只允许拖拽
    noKeyboard: true, // 禁用键盘
    noDragEventsBubbling: true,
  });

  return (
    <DropContext.Provider value={{ isDragActive }}>
      <div {...getRootProps()} className="h-full relative">
        <input {...getInputProps()} />
        {children}

        {/* 拖拽遮罩层 - 始终渲染，通过 opacity 控制显示 */}
        <div
          className={cn(
            "absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200 pointer-events-none",
            isDragActive ? "opacity-100 pointer-events-auto" : "opacity-0"
          )}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="bg-primary/10 rounded-full p-8">
              <Upload className="w-16 h-16 text-primary animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold">拖放文件到这里</h3>
              <p className="text-muted-foreground flex items-center gap-2 justify-center">
                <ImageIcon className="w-4 h-4" />
                支持图片
                <span className="mx-1">•</span>
                <FileIcon className="w-4 h-4" />
                支持文件
              </p>
            </div>
          </div>
        </div>
      </div>
    </DropContext.Provider>
  );
}
