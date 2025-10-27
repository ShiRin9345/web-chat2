import { useState, useCallback } from "react";
import { uploadFileToOSS } from "@/utils/ossUpload";

export interface UploadState {
  uploading: boolean;
  uploadingType: "image" | "file" | null;
  uploadProgress: number;
  uploadError: string | null;
  currentFile: File | null;
}

export interface UseFileUploadOptions {
  currentUserId: string;
  onSuccess: (content: string, type: "image" | "file") => void;
}

export function useFileUpload({
  currentUserId,
  onSuccess,
}: UseFileUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [uploadingType, setUploadingType] = useState<"image" | "file" | null>(
    null
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  // 处理文件上传
  const handleFileUpload = useCallback(
    async (file: File, type: "image" | "file") => {
      setUploading(true);
      setUploadingType(type);
      setUploadProgress(0);
      setUploadError(null);
      setCurrentFile(file);

      try {
        // 上传文件到OSS
        const fileUrl = await uploadFileToOSS(
          file,
          type,
          currentUserId,
          (progress) => {
            setUploadProgress(progress);
          }
        );

        // 上传成功后构造消息内容
        let content: string;
        if (type === "image") {
          content = fileUrl;
        } else {
          // 文件消息需要包含元信息
          const fileInfo = {
            name: file.name,
            url: fileUrl,
            size: file.size,
            mimeType: file.type,
          };
          content = JSON.stringify(fileInfo);
        }

        // 调用成功回调
        onSuccess(content, type);

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
    [currentUserId, onSuccess]
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
