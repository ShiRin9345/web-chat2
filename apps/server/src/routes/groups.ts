import { Router } from "express";
import { db } from "../db/index.ts";
import { groups, groupMembers, user } from "../db/schema.ts";
import { eq, and } from "drizzle-orm";
import { authenticateUser } from "../middleware/auth.ts";

const router = Router();

// 获取我加入的群聊列表
router.get("/", authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;

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
    const userId = req.user!.id;
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
        role: "member",
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
    const userId = req.user!.id;
    const { groupId } = req.params;

    // 检查群聊是否存在
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId));

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // 检查是否已经是成员
    const [existingMember] = await db
      .select()
      .from(groupMembers)
      .where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))
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

    const members = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: groupMembers.role,
        joinedAt: groupMembers.joinedAt,
      })
      .from(groupMembers)
      .innerJoin(user, eq(groupMembers.userId, user.id))
      .where(eq(groupMembers.groupId, groupId));

    res.json(members);
  } catch (error) {
    console.error("Error fetching group members:", error);
    res.status(500).json({ error: "Failed to fetch group members" });
  }
});

export { router as groupsRouter };
