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
        console.log(`WebSocket 上传进度: ${data.fileName} - ${data.progress}%`);

        // 更新队列中正在上传的文件（找到进度 < 100 的第一个文件）
        setUploadQueue((prev) =>
          prev.map((item, index) => {
            // 找到第一个还在上传中的文件
            const uploadingIndex = prev.findIndex((i) => i.progress < 100);
            if (index === uploadingIndex) {
              return { ...item, progress: data.progress };
            }
            return item;
          })
        );
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

      // 判断文件大小，决定是否使用本地进度
      const MULTIPART_THRESHOLD = 5 * 1024 * 1024; // 5MB
      const isLargeFile = file.size > MULTIPART_THRESHOLD;

      try {
        // 上传文件到OSS（后端会自动保存消息到数据库）
        await uploadFileToOSS(file, type, currentUserId, chatId, (progress) => {
          // 只有小文件才使用 Axios 本地进度
          // 大文件的进度由 WebSocket 事件更新
          if (!isLargeFile) {
            setUploadQueue((prev) =>
              prev.map((item) =>
                item.file === file ? { ...item, progress } : item
              )
            );
          }
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
