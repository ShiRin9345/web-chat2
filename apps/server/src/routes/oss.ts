import express from "express";
import OSS from "ali-oss";
import { config } from "dotenv";
import { authenticateUser } from "@/middleware/auth.ts";
import multer from "multer";
import { randomBytes } from "crypto";

config({ path: ".env.local" });

export const ossRouter = express.Router();

// 文件大小限制
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// 分片上传阈值
const MULTIPART_THRESHOLD = 5 * 1024 * 1024; // 5MB

// 配置 multer 内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * 初始化OSS客户端
 */
function initOssClient(): OSS {
  const {
    ALI_OSS_ACCESS_KEY_ID,
    ALI_OSS_ACCESS_KEY_SECRET,
    ALI_OSS_REGION,
    ALI_OSS_BUCKET,
  } = process.env;

  if (!ALI_OSS_ACCESS_KEY_ID || !ALI_OSS_ACCESS_KEY_SECRET || !ALI_OSS_BUCKET) {
    throw new Error("OSS配置不完整");
  }

  return new OSS({
    region: ALI_OSS_REGION || "oss-cn-hangzhou",
    accessKeyId: ALI_OSS_ACCESS_KEY_ID,
    accessKeySecret: ALI_OSS_ACCESS_KEY_SECRET,
    bucket: ALI_OSS_BUCKET,
    timeout: 300000, // 全局超时时间 5分钟
  });
}

/**
 * 生成唯一文件名
 */
function generateFileName(
  userId: string,
  originalName: string,
  fileType: "image" | "file"
): string {
  const timestamp = Date.now();
  const random = randomBytes(4).toString("hex");
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;

  // 获取文件扩展名
  const ext = originalName.substring(originalName.lastIndexOf("."));

  // 格式: uploads/{fileType}/{userId}/{YYYYMM}/{timestamp}_{random}{ext}
  const typeDir = fileType === "image" ? "images" : "files";
  return `uploads/${typeDir}/${userId}/${yearMonth}/${timestamp}_${random}${ext}`;
}

/**
 * 验证文件类型
 */
function validateFile(
  file: Express.Multer.File,
  fileType: "image" | "file"
): { valid: boolean; error?: string } {
  // 检查文件大小
  const maxSize = fileType === "image" ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  if (file.size > maxSize) {
    const maxSizeMB = Math.floor(maxSize / (1024 * 1024));
    return { valid: false, error: `文件大小不能超过${maxSizeMB}MB` };
  }

  // 检查图片类型
  if (fileType === "image" && !file.mimetype.startsWith("image/")) {
    return { valid: false, error: "请选择图片文件" };
  }

  // 禁止的文件类型黑名单
  const forbiddenExtensions = [".exe", ".bat", ".sh", ".cmd", ".dll", ".so"];
  const fileExtension = file.originalname
    .substring(file.originalname.lastIndexOf("."))
    .toLowerCase();
  if (forbiddenExtensions.includes(fileExtension)) {
    return { valid: false, error: "不支持该文件类型" };
  }

  return { valid: true };
}

/**
 * 上传图片到OSS
 */
ossRouter.post(
  "/upload/image",
  authenticateUser,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "请选择文件" });
      }

      // 验证文件
      const validation = validateFile(req.file, "image");
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // 初始化OSS客户端
      const client = initOssClient();

      // 生成文件名
      const fileName = generateFileName(
        req.user!.id,
        req.file.originalname,
        "image"
      );

      // 上传到OSS
      let url: string;

      if (req.file.size <= MULTIPART_THRESHOLD) {
        // 直传 (≤ 5MB)
        const result = await client.put(fileName, req.file.buffer, {
          timeout: 180000, // 3分钟超时
          headers: {
            "Content-Type": req.file.mimetype,
          },
        });
        url = result.url;
      } else {
        // 分片上传 (> 5MB)
        await client.multipartUpload(fileName, req.file.buffer, {
          partSize: 1024 * 1024, // 1MB per part
          parallel: 4, // 4个并发
          timeout: 300000, // 5分钟超时
        });
        // multipartUpload 没有直接返回 url，需要手动构造
        const { ALI_OSS_BUCKET, ALI_OSS_REGION } = process.env;
        const region = ALI_OSS_REGION || "oss-cn-hangzhou";
        url = `https://${ALI_OSS_BUCKET}.${region}.aliyuncs.com/${fileName}`;
      }

      res.json({
        url,
        name: fileName,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (error: any) {
      console.error("图片上传失败:", error);
      res.status(500).json({
        error: "上传失败",
        message: error.message,
      });
    }
  }
);

/**
 * 上传文件到OSS
 */
ossRouter.post(
  "/upload/file",
  authenticateUser,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "请选择文件" });
      }

      // 验证文件
      const validation = validateFile(req.file, "file");
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // 初始化OSS客户端
      const client = initOssClient();

      // 生成文件名
      const fileName = generateFileName(
        req.user!.id,
        req.file.originalname,
        "file"
      );

      // 上传到OSS
      let url: string;

      if (req.file.size <= MULTIPART_THRESHOLD) {
        // 直传 (≤ 5MB)
        const result = await client.put(fileName, req.file.buffer, {
          timeout: 180000, // 3分钟超时
          headers: {
            "Content-Type": req.file.mimetype,
          },
        });
        url = result.url;
      } else {
        // 分片上传 (> 5MB)
        await client.multipartUpload(fileName, req.file.buffer, {
          partSize: 1024 * 1024, // 1MB per part
          parallel: 4, // 4个并发
          timeout: 300000, // 5分钟超时
        });
        // multipartUpload 没有直接返回 url，需要手动构造
        const { ALI_OSS_BUCKET, ALI_OSS_REGION } = process.env;
        const region = ALI_OSS_REGION || "oss-cn-hangzhou";
        url = `https://${ALI_OSS_BUCKET}.${region}.aliyuncs.com/${fileName}`;
      }

      res.json({
        url,
        name: fileName,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (error: any) {
      console.error("文件上传失败:", error);
      res.status(500).json({
        error: "上传失败",
        message: error.message,
      });
    }
  }
);

// 获取OSS上传的STS临时凭证
ossRouter.get(
  "/get_sts_token_for_oss_upload",
  authenticateUser,
  async (req, res) => {
    try {
      // 验证必需的环境变量
      const { ALI_OSS_ACCESS_KEY_ID, ALI_OSS_ACCESS_KEY_SECRET, ALI_OSS_ARN } =
        process.env;

      if (
        !ALI_OSS_ACCESS_KEY_ID ||
        !ALI_OSS_ACCESS_KEY_SECRET ||
        !ALI_OSS_ARN
      ) {
        console.error("Missing required OSS environment variables");
        return res.status(500).json({ error: "OSS配置错误" });
      }

      const sts = new OSS.STS({
        accessKeyId: ALI_OSS_ACCESS_KEY_ID,
        accessKeySecret: ALI_OSS_ACCESS_KEY_SECRET,
      });

      // 使用用户ID作为session名称,便于审计
      const sessionName = `chat-upload-${req.user!.id}`;

      const result = await sts.assumeRole(
        ALI_OSS_ARN,
        "",
        3000, // Token有效期3000秒
        sessionName
      );

      res.json({
        AccessKeyId: result.credentials.AccessKeyId,
        AccessKeySecret: result.credentials.AccessKeySecret,
        SecurityToken: result.credentials.SecurityToken,
        Expiration: result.credentials.Expiration,
      });
    } catch (err: any) {
      console.error("STS Token获取失败:", err);
      res.status(500).json({
        error: "无法获取上传凭证",
        message: err.message,
      });
    }
  }
);

export default ossRouter;
