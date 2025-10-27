import { Router } from "express";
import { db, messages, user } from "@workspace/database";
import { eq, and, or, desc, lt } from "drizzle-orm";
import { authenticateUser } from "@/middleware/auth.ts";

const router = Router();

// 获取消息列表（支持分页）
router.get("/", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { chatId, cursor, limit = "50" } = req.query;

    if (!chatId || typeof chatId !== "string") {
      return res.status(400).json({ error: "chatId is required" });
    }

    const pageLimit = Math.min(Number.parseInt(limit as string), 100);

    // 解析 chatId: friend-{userId} 或 group-{groupId}
    const [chatType, targetId] = chatId.split("-");

    if (!chatType || !targetId) {
      return res.status(400).json({ error: "Invalid chatId format" });
    }

    // 构建查询条件
    let whereConditions;
    
    if (chatType === "friend") {
      // 私聊消息：发送者和接收者之间的消息
      whereConditions = or(
        and(
          eq(messages.senderId, userId),
          eq(messages.recipientId, targetId)
        ),
        and(
          eq(messages.senderId, targetId),
          eq(messages.recipientId, userId)
        )
      );
    } else if (chatType === "group") {
      // 群聊消息
      whereConditions = eq(messages.groupId, targetId);
    } else {
      return res.status(400).json({ error: "Invalid chat type" });
    }

    // 添加游标条件
    if (cursor && typeof cursor === "string") {
      whereConditions = and(
        whereConditions,
        lt(messages.createdAt, new Date(cursor))
      );
    }

    // 查询消息（降序排列，最新消息优先）
    const messageList = await db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        recipientId: messages.recipientId,
        groupId: messages.groupId,
        type: messages.type,
        isRead: messages.isRead,
        createdAt: messages.createdAt,
        sender: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
      })
      .from(messages)
      .leftJoin(user, eq(messages.senderId, user.id))
      .where(whereConditions)
      .orderBy(desc(messages.createdAt))
      .limit(pageLimit + 1); // 多查一条用于判断是否有下一页

    // 判断是否有更多数据
    const hasMore = messageList.length > pageLimit;
    const resultMessages = hasMore ? messageList.slice(0, pageLimit) : messageList;

    // 获取下一页游标（最后一条消息的创建时间）
    const lastMessage = resultMessages[resultMessages.length - 1];
    const nextCursor = hasMore && lastMessage?.createdAt
      ? lastMessage.createdAt.toISOString()
      : null;

    res.json({
      messages: resultMessages,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// 标记消息为已读
router.post("/read/:messageId", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { messageId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!messageId) {
      return res.status(400).json({ error: "Message ID is required" });
    }

    // 只能标记发给自己的消息为已读
    const [message] = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.id, messageId),
          or(
            eq(messages.recipientId, userId),
            // 群聊消息暂时不处理已读状态，或者需要单独的已读记录表
          )
        )
      );

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, messageId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({ error: "Failed to mark message as read" });
  }
});

// 批量标记消息为已读
router.post("/read-batch", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { chatId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!chatId || typeof chatId !== "string") {
      return res.status(400).json({ error: "chatId is required" });
    }

    const [chatType, targetId] = chatId.split("-");

    if (!chatType || !targetId) {
      return res.status(400).json({ error: "Invalid chatId format" });
    }

    let whereConditions;
    
    if (chatType === "friend") {
      // 标记好友发给我的未读消息
      whereConditions = and(
        eq(messages.senderId, targetId),
        eq(messages.recipientId, userId),
        eq(messages.isRead, false)
      );
    } else if (chatType === "group") {
      // 群聊消息标记为已读
      whereConditions = and(
        eq(messages.groupId, targetId),
        eq(messages.isRead, false)
      );
    } else {
      return res.status(400).json({ error: "Invalid chat type" });
    }

    await db
      .update(messages)
      .set({ isRead: true })
      .where(whereConditions);

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

export { router as messagesRouter };
