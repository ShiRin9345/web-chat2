import { useState, useCallback, useEffect } from "react";
import { uploadFileToOSS } from "@/utils/ossUpload";
import { socket } from "@/lib/socket";

export interface UploadState {
  uploading: boolean;
  uploadingType: "image" | "file" | null;
  uploadProgress: number;
  uploadError: string | null;
  currentFile: File | null;
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

  // 处理文件上传
  const handleFileUpload = useCallback(
    async (file: File, type: "image" | "file") => {
      setUploading(true);
      setUploadingType(type);
      setUploadProgress(0);
      setUploadError(null);
      setCurrentFile(file);

      try {
        // 上传文件到OSS（后端会自动保存消息到数据库）
        // 注：对于小文件 (≤5MB) 使用本地进度，大文件 (>5MB) 会通过 WebSocket 事件接收进度
        await uploadFileToOSS(
          file,
          type,
          currentUserId,
          chatId,
          (progress) => {
            // 本地上传进度（Axios 的 onUploadProgress）
            setUploadProgress(progress);
          }
        );

        // 上传成功，调用成功回调（如果有）
        onSuccess?.();

        // 重置状态
        setUploading(false);
        setUploadingType(null);
        setUploadProgress(0);
        setCurrentFile(null);
      } catch (error: any) {
        console.error("文件上传失败:", error);
        setUploadError(error.message || "上传失败");
        setUploading(false);
      }
    },
    [currentUserId, chatId, onSuccess]
  );

  // 取消上传
  const cancelUpload = useCallback(() => {
    setUploading(false);
    setUploadingType(null);
    setUploadProgress(0);
    setUploadError(null);
    setCurrentFile(null);
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
    // 方法
    handleFileUpload,
    cancelUpload,
    clearError,
  };
}
