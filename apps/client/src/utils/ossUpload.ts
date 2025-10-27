import axios from "axios";

const API_BASE = "http://localhost:3001/api";

// 文件大小限制 (字节)
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// 文件验证结果类型
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// 文件信息类型
export interface FileInfo {
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

/**
 * 验证文件
 */
export function validateFile(
  file: File,
  fileType: "image" | "file"
): ValidationResult {
  // 检查文件是否为空
  if (!file || file.size === 0) {
    return { valid: false, error: "文件不能为空" };
  }

  // 检查文件大小
  const maxSize = fileType === "image" ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  if (file.size > maxSize) {
    const maxSizeMB = Math.floor(maxSize / (1024 * 1024));
    return { valid: false, error: `文件大小不能超过${maxSizeMB}MB` };
  }

  // 检查图片类型
  if (fileType === "image" && !file.type.startsWith("image/")) {
    return { valid: false, error: "请选择图片文件" };
  }

  // 禁止的文件类型黑名单
  const forbiddenExtensions = [".exe", ".bat", ".sh", ".cmd", ".dll", ".so"];
  const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
  if (forbiddenExtensions.includes(fileExtension)) {
    return { valid: false, error: "不支持该文件类型" };
  }

  return { valid: true };
}

/**
 * 上传文件到后端API
 */
export async function uploadFileToOSS(
  file: File,
  fileType: "image" | "file",
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // 验证文件
  const validation = validateFile(file, fileType);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    // 创建FormData
    const formData = new FormData();
    formData.append("file", file);

    // 选择上传接口
    const uploadUrl = fileType === "image" 
      ? `${API_BASE}/oss/upload/image`
      : `${API_BASE}/oss/upload/file`;

    // 上传文件
    const response = await axios.post<FileInfo>(uploadUrl, formData, {
      withCredentials: true,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    // 返回文件URL
    return response.data.url;
  } catch (error: any) {
    console.error("文件上传失败:", error);

    // 解析错误类型并提供友好提示
    if (error.response?.status === 401) {
      throw new Error("请先登录");
    } else if (error.response?.status === 400) {
      throw new Error(error.response.data.error || "文件验证失败");
    } else if (error.response?.status === 413) {
      throw new Error("文件过大");
    } else if (error.code === "ECONNABORTED") {
      throw new Error("上传超时，请检查网络连接");
    } else {
      throw new Error(error.response?.data?.error || error.message || "上传失败，请稍后重试");
    }
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
