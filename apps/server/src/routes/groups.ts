import { Router } from "express";
import { db, groups, groupMembers, user } from "@workspace/database";
import { eq, and } from "drizzle-orm";
import { authenticateUser } from "@/middleware/auth.ts";
import type { Server } from "socket.io";

const router = Router();

// 获取我加入的群聊列表
router.get("/", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userGroups = await db
      .select({
        id: groups.id,
        name: groups.name,
        avatar: groups.avatar,
        creatorId: groups.creatorId,
        createdAt: groups.createdAt,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.userId, userId));

    // 获取每个群的成员数量
    const groupsWithMemberCount = await Promise.all(
      userGroups.map(async (group) => {
        const memberCount = await db
          .select({ count: groupMembers.id })
          .from(groupMembers)
          .where(eq(groupMembers.groupId, group.id));

        return {
          ...group,
          memberCount: memberCount.length,
        };
      })
    );

    res.json(groupsWithMemberCount);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

// 创建群聊
router.post("/", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const { name, avatar, memberIds } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Group name is required" });
    }

    // 创建群聊
    const [newGroup] = await db
      .insert(groups)
      .values({
        name,
        avatar,
        creatorId: userId,
      })
      .returning();

    if (!newGroup) {
      return res.status(500).json({ error: "Failed to create group" });
    }

    // 添加创建者为管理员
    await db.insert(groupMembers).values({
      groupId: newGroup.id,
      userId: userId,
      role: "admin",
    });

    // 添加其他成员
    if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
      const memberData = memberIds.map((memberId: string) => ({
        groupId: newGroup.id,
        userId: memberId,
        role: "member" as const,
      }));

      await db.insert(groupMembers).values(memberData);
    }

    res.json(newGroup);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Failed to create group" });
  }
});

// 加入群聊
router.post("/:groupId/join", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }

    // 检查群聊是否存在
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId!));

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // 检查是否已经是成员
    const [existingMember] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId!),
          eq(groupMembers.userId, userId!)
        )
      );

    if (existingMember) {
      return res.status(400).json({ error: "Already a member of this group" });
    }

    // 加入群聊
    await db.insert(groupMembers).values({
      groupId,
      userId,
      role: "member",
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error joining group:", error);
    res.status(500).json({ error: "Failed to join group" });
  }
});

// 获取群成员列表
router.get("/:groupId/members", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }

    const members = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        code: user.code,
        role: groupMembers.role,
        joinedAt: groupMembers.joinedAt,
      })
      .from(groupMembers)
      .innerJoin(user, eq(groupMembers.userId, user.id))
      .where(eq(groupMembers.groupId, groupId!));

    res.json(members);
  } catch (error) {
    console.error("Error fetching group members:", error);
    res.status(500).json({ error: "Failed to fetch group members" });
  }
});

// 退出群聊
router.delete("/:groupId/leave", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }

    // 检查群聊是否存在
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId!));

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // 检查是否是群成员
    const [member] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId!),
          eq(groupMembers.userId, userId!)
        )
      );

    if (!member) {
      return res.status(400).json({ error: "Not a member of this group" });
    }

    // 如果是群主，不允许退出（需要先转让群主）
    if (group.creatorId === userId) {
      return res
        .status(400)
        .json({
          error:
            "Group creator cannot leave. Please transfer ownership first or delete the group.",
        });
    }

    // 删除群成员记录
    await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId!),
          eq(groupMembers.userId, userId!)
        )
      );

    // 获取 Socket.IO 实例
    const io = req.app.get("io") as Server;
    if (io) {
      // 通知群组成员有人退出
      io.to(`group:${groupId}`).emit("group:member-left", {
        groupId,
        userId,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error leaving group:", error);
    res.status(500).json({ error: "Failed to leave group" });
  }
});

export { router as groupsRouter };
