import express from "express";
import OSS from "ali-oss";
import { config } from "dotenv";
import { authenticateUser } from "@/middleware/auth.ts";
import multer from "multer";
import { randomBytes } from "crypto";
import { io } from "@/index.ts";
import { onlineUserService } from "@/services/onlineUsers.ts";
import { db } from "@workspace/database";
import { messages as messagesTable, user as userTable } from "@workspace/database/schema";
import { eq } from "drizzle-orm";

config({ path: ".env.local" });

export const ossRouter = express.Router();

// 文件大小限制
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

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
 * 上传图片到OSS并保存消息到数据库
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

      // 获取聊天相关参数
      const { chatId } = req.body;
      if (!chatId) {
        return res.status(400).json({ error: "缺少chatId参数" });
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
          timeout: 60000,
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
          progress: (p: number) => {
            // p 是 0-1 之间的小数，乘以 100 得到百分比
            const progressPercent = Math.round(p * 100);
            console.log(`图片上传进度: ${progressPercent}%`);
            // 通过 WebSocket 推送给当前用户
            const socketId = onlineUserService.getSocketId(req.user!.id);
            if (socketId) {
              io.to(socketId).emit("upload:progress", {
                userId: req.user!.id,
                fileName: fileName,
                progress: progressPercent,
              });
            }
          },
        });
        // multipartUpload 没有直接返回 url，需要手动构造
        const { ALI_OSS_BUCKET, ALI_OSS_REGION } = process.env;
        const region = ALI_OSS_REGION || "oss-cn-hangzhou";
        url = `https://${ALI_OSS_BUCKET}.${region}.aliyuncs.com/${fileName}`;
      }

      // 上传成功后，保存消息到数据库
      const isFriendChat = chatId.startsWith("friend-");
      const isGroupChat = chatId.startsWith("group-");

      const [newMessage] = await db
        .insert(messagesTable)
        .values({
          content: url,
          senderId: req.user!.id,
          recipientId: isFriendChat ? chatId.replace("friend-", "") : null,
          groupId: isGroupChat ? chatId.replace("group-", "") : null,
          type: "image",
          isRead: false,
        })
        .returning();

      // 获取发送者信息
      const [sender] = await db
        .select({
          id: userTable.id,
          name: userTable.name,
          image: userTable.image,
          email: userTable.email,
          code: userTable.code,
        })
        .from(userTable)
        .where(eq(userTable.id, req.user!.id))
        .limit(1);

      // 构造完整消息对象
      const messageWithSender = {
        ...newMessage,
        sender,
      };

      // 通过 WebSocket 推送消息
      if (isGroupChat) {
        const groupId = chatId.replace("group-", "");
        io.to(`group:${groupId}`).emit("message:new", messageWithSender);
      } else if (isFriendChat) {
        const recipientId = chatId.replace("friend-", "");
        const recipientSocketId = onlineUserService.getSocketId(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("message:new", messageWithSender);
        }
      }

      // 也推送给发送者（用于多设备同步）
      const senderSocketId = onlineUserService.getSocketId(req.user!.id);
      if (senderSocketId) {
        io.to(senderSocketId).emit("message:new", messageWithSender);
      }

      res.json({
        message: messageWithSender,
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
 * 上传文件到OSS并保存消息到数据库
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

      // 获取聊天相关参数
      const { chatId } = req.body;
      if (!chatId) {
        return res.status(400).json({ error: "缺少chatId参数" });
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
          timeout: 60000,
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
          progress: (p: number) => {
            // p 是 0-1 之间的小数，乘以 100 得到百分比
            const progressPercent = Math.round(p * 100);
            console.log(`文件上传进度: ${progressPercent}%`);
            // 通过 WebSocket 推送给当前用户
            const socketId = onlineUserService.getSocketId(req.user!.id);
            if (socketId) {
              io.to(socketId).emit("upload:progress", {
                userId: req.user!.id,
                fileName: fileName,
                progress: progressPercent,
              });
            }
          },
        });
        // multipartUpload 没有直接返回 url，需要手动构造
        const { ALI_OSS_BUCKET, ALI_OSS_REGION } = process.env;
        const region = ALI_OSS_REGION || "oss-cn-hangzhou";
        url = `https://${ALI_OSS_BUCKET}.${region}.aliyuncs.com/${fileName}`;
      }

      // 上传成功后，构造文件元信息并保存消息到数据库
      const fileInfo = {
        name: req.file.originalname,
        url,
        size: req.file.size,
        mimeType: req.file.mimetype,
      };

      const isFriendChat = chatId.startsWith("friend-");
      const isGroupChat = chatId.startsWith("group-");

      const [newMessage] = await db
        .insert(messagesTable)
        .values({
          content: JSON.stringify(fileInfo),
          senderId: req.user!.id,
          recipientId: isFriendChat ? chatId.replace("friend-", "") : null,
          groupId: isGroupChat ? chatId.replace("group-", "") : null,
          type: "file",
          isRead: false,
        })
        .returning();

      // 获取发送者信息
      const [sender] = await db
        .select({
          id: userTable.id,
          name: userTable.name,
          image: userTable.image,
          email: userTable.email,
          code: userTable.code,
        })
        .from(userTable)
        .where(eq(userTable.id, req.user!.id))
        .limit(1);

      // 构造完整消息对象
      const messageWithSender = {
        ...newMessage,
        sender,
      };

      // 通过 WebSocket 推送消息
      if (isGroupChat) {
        const groupId = chatId.replace("group-", "");
        io.to(`group:${groupId}`).emit("message:new", messageWithSender);
      } else if (isFriendChat) {
        const recipientId = chatId.replace("friend-", "");
        const recipientSocketId = onlineUserService.getSocketId(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("message:new", messageWithSender);
        }
      }

      // 也推送给发送者（用于多设备同步）
      const senderSocketId = onlineUserService.getSocketId(req.user!.id);
      if (senderSocketId) {
        io.to(senderSocketId).emit("message:new", messageWithSender);
      }

      res.json({
        message: messageWithSender,
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
ossRouter.get("/get_sts_token_for_oss_upload", async (req, res) => {
  try {
    // 验证必需的环境变量
    const { ALI_OSS_ACCESS_KEY_ID, ALI_OSS_ACCESS_KEY_SECRET, ALI_OSS_ARN } =
      process.env;

    if (!ALI_OSS_ACCESS_KEY_ID || !ALI_OSS_ACCESS_KEY_SECRET || !ALI_OSS_ARN) {
      console.error("Missing required OSS environment variables");
      return res.status(500).json({ error: "OSS配置错误" });
    }

    const sts = new OSS.STS({
      accessKeyId: ALI_OSS_ACCESS_KEY_ID,
      accessKeySecret: ALI_OSS_ACCESS_KEY_SECRET,
    });

    const result = await sts.assumeRole(
      ALI_OSS_ARN,
      "",
      3000, // Token有效期3000秒
      "teset"
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
});

export default ossRouter;
