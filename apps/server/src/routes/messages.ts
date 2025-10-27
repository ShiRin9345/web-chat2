import { Router } from "express";
import { db } from "@workspace/database";
import { messages as messagesTable, user as userTable } from "@workspace/database/schema";
import { and, eq, or, lt, desc } from "drizzle-orm";
import { authenticateUser } from "@/middleware/auth";

export const messagesRouter = Router();

// 获取消息列表（分页）
messagesRouter.get("/", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "未授权" });
    }

    const { chatId, cursor, limit = "50" } = req.query;

    if (!chatId || typeof chatId !== "string") {
      return res.status(400).json({ error: "chatId 参数必填" });
    }

    const pageLimit = Number.parseInt(limit as string, 10);
    if (Number.isNaN(pageLimit) || pageLimit > 100) {
      return res.status(400).json({ error: "limit 参数无效或超过最大值 100" });
    }

    // 解析 chatId
    const isFriendChat = chatId.startsWith("friend-");
    const isGroupChat = chatId.startsWith("group-");

    if (!isFriendChat && !isGroupChat) {
      return res.status(400).json({ error: "chatId 格式无效" });
    }

    let whereCondition;
    
    if (isFriendChat) {
      const friendId = chatId.replace("friend-", "");
      // 一对一聊天：查询双方之间的消息
      whereCondition = and(
        or(
          and(
            eq(messagesTable.senderId, userId),
            eq(messagesTable.recipientId, friendId)
          ),
          and(
            eq(messagesTable.senderId, friendId),
            eq(messagesTable.recipientId, userId)
          )
        ),
        cursor ? lt(messagesTable.createdAt, new Date(cursor as string)) : undefined
      );
    } else {
      const groupId = chatId.replace("group-", "");
      // 群聊：查询群组消息
      whereCondition = and(
        eq(messagesTable.groupId, groupId),
        cursor ? lt(messagesTable.createdAt, new Date(cursor as string)) : undefined
      );
    }

    // 查询消息，按时间降序（最新的在前）
    const messagesList = await db
      .select({
        id: messagesTable.id,
        content: messagesTable.content,
        senderId: messagesTable.senderId,
        recipientId: messagesTable.recipientId,
        groupId: messagesTable.groupId,
        type: messagesTable.type,
        isRead: messagesTable.isRead,
        createdAt: messagesTable.createdAt,
        sender: {
          id: userTable.id,
          name: userTable.name,
          image: userTable.image,
        },
      })
      .from(messagesTable)
      .innerJoin(userTable, eq(messagesTable.senderId, userTable.id))
      .where(whereCondition)
      .orderBy(desc(messagesTable.createdAt))
      .limit(pageLimit + 1); // 多查询一条用于判断是否还有更多

    const hasMore = messagesList.length > pageLimit;
    const messages = hasMore ? messagesList.slice(0, pageLimit) : messagesList;

    // 计算下一页游标（使用最后一条消息的时间戳）
    const nextCursor = hasMore && messages.length > 0
      ? messages[messages.length - 1].createdAt.toISOString()
      : null;

    res.json({
      messages,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("获取消息列表失败:", error);
    res.status(500).json({ error: "获取消息列表失败" });
  }
});

// 标记单条消息为已读
messagesRouter.post("/read/:messageId", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "未授权" });
    }

    const { messageId } = req.params;

    // 只能标记发送给自己的消息为已读
    await db
      .update(messagesTable)
      .set({ isRead: true })
      .where(
        and(
          eq(messagesTable.id, messageId),
          eq(messagesTable.recipientId, userId)
        )
      );

    res.json({ success: true });
  } catch (error) {
    console.error("标记消息已读失败:", error);
    res.status(500).json({ error: "标记消息已读失败" });
  }
});

// 批量标记消息为已读
messagesRouter.post("/read-batch", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "未授权" });
    }

    const { chatId } = req.body;

    if (!chatId || typeof chatId !== "string") {
      return res.status(400).json({ error: "chatId 参数必填" });
    }

    const isFriendChat = chatId.startsWith("friend-");
    
    if (isFriendChat) {
      const friendId = chatId.replace("friend-", "");
      // 标记来自好友的所有未读消息为已读
      await db
        .update(messagesTable)
        .set({ isRead: true })
        .where(
          and(
            eq(messagesTable.senderId, friendId),
            eq(messagesTable.recipientId, userId),
            eq(messagesTable.isRead, false)
          )
        );
    }
    // 注意：群聊消息通常不需要已读状态

    res.json({ success: true });
  } catch (error) {
    console.error("批量标记消息已读失败:", error);
    res.status(500).json({ error: "批量标记消息已读失败" });
  }
});
