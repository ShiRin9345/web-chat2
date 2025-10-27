import { useState, useCallback, useEffect } from "react";
import { uploadFileToOSS } from "@/utils/ossUpload";
import { socket } from "@/lib/socket";

export interface UploadState {
  uploading: boolean;
  uploadingType: "image" | "file" | null;
  uploadProgress: number;
  uploadError: string | null;
  currentFile: File | null;
  uploadQueue: Array<{ file: File; type: "image" | "file"; progress: number }>; // 上传队列
}

export interface UseFileUploadOptions {
  currentUserId: string;
  chatId: string;
  onSuccess?: () => void; // 可选的成功回调
}

export function useFileUpload({
  currentUserId,
  chatId,
  onSuccess,
}: UseFileUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [uploadingType, setUploadingType] = useState<"image" | "file" | null>(
    null
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [uploadQueue, setUploadQueue] = useState<
    Array<{ file: File; type: "image" | "file"; progress: number }>
  >([]); // 上传队列

  // 监听后端上传进度 WebSocket 事件
  useEffect(() => {
    const handleUploadProgress = (data: {
      userId: string;
      fileName: string;
      progress: number;
    }) => {
      // 只更新当前用户的上传进度
      if (data.userId === currentUserId) {
        setUploadProgress(data.progress);
        console.log(`WebSocket 上传进度: ${data.progress}%`);
      }
    };

    socket.on("upload:progress", handleUploadProgress);

    return () => {
      socket.off("upload:progress", handleUploadProgress);
    };
  }, [currentUserId]);

  // 处理文件上传（支持并发上传）
  const handleFileUpload = useCallback(
    async (file: File, type: "image" | "file") => {
      // 添加到上传队列
      setUploadQueue((prev) => [...prev, { file, type, progress: 0 }]);
      setUploading(true);
      setUploadingType(type);

      try {
        // 上传文件到OSS（后端会自动保存消息到数据库）
        await uploadFileToOSS(file, type, currentUserId, chatId, (progress) => {
          // 更新该文件的上传进度
          setUploadQueue((prev) =>
            prev.map((item) =>
              item.file === file ? { ...item, progress } : item
            )
          );
        });

        // 上传成功，从队列中移除
        setUploadQueue((prev) => prev.filter((item) => item.file !== file));

        // 调用成功回调
        onSuccess?.();

        // 如果队列为空，重置状态
        setUploadQueue((prev) => {
          if (prev.length === 0) {
            setUploading(false);
            setUploadingType(null);
            setUploadProgress(0);
            setCurrentFile(null);
          }
          return prev;
        });
      } catch (error: any) {
        console.error("文件上传失败:", error);
        // 从队列中移除失败的文件
        setUploadQueue((prev) => prev.filter((item) => item.file !== file));
        setUploadError(`${file.name}: ${error.message || "上传失败"}`);
      }
    },
    [currentUserId, chatId, onSuccess]
  );

  // 取消所有上传
  const cancelUpload = useCallback(() => {
    setUploading(false);
    setUploadingType(null);
    setUploadProgress(0);
    setUploadError(null);
    setCurrentFile(null);
    setUploadQueue([]);
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setUploadError(null);
  }, []);

  return {
    // 状态
    uploading,
    uploadingType,
    uploadProgress,
    uploadError,
    currentFile,
    uploadQueue, // 返回上传队列
    // 方法
    handleFileUpload,
    cancelUpload,
    clearError,
  };
}
