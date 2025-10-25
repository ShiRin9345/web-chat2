import { Router } from "express";
import { db } from "../db/index.ts";
import { friendships, friendRequests, user } from "../db/schema.ts";
import { eq, and, or } from "drizzle-orm";
import { authenticateUser } from "../middleware/auth.ts";
const router = Router();

// 获取好友列表
router.get("/", authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;

    const friends = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: friendships.createdAt,
      })
      .from(friendships)
      .innerJoin(user, eq(friendships.friendId, user.id))
      .where(
        and(eq(friendships.userId, userId), eq(friendships.status, "accepted"))
      );

    res.json(friends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ error: "Failed to fetch friends" });
  }
});

// 获取好友申请列表
router.get("/requests", authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;

    const requests = await db
      .select({
        id: friendRequests.id,
        fromUserId: friendRequests.fromUserId,
        message: friendRequests.message,
        status: friendRequests.status,
        createdAt: friendRequests.createdAt,
        fromUser: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      })
      .from(friendRequests)
      .innerJoin(user, eq(friendRequests.fromUserId, user.id))
      .where(
        and(
          eq(friendRequests.toUserId, userId),
          eq(friendRequests.status, "pending")
        )
      );

    res.json(requests);
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    res.status(500).json({ error: "Failed to fetch friend requests" });
  }
});

// 发送好友申请
router.post("/request", authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { toUserId, message } = req.body;

    if (!toUserId) {
      return res.status(400).json({ error: "toUserId is required" });
    }

    if (toUserId === userId) {
      return res
        .status(400)
        .json({ error: "Cannot send friend request to yourself" });
    }

    // 检查是否已经是好友
    const existingFriendship = await db
      .select()
      .from(friendships)
      .where(
        and(
          or(
            and(
              eq(friendships.userId, userId),
              eq(friendships.friendId, toUserId)
            ),
            and(
              eq(friendships.userId, toUserId),
              eq(friendships.friendId, userId)
            )
          ),
          eq(friendships.status, "accepted")
        )
      );

    if (existingFriendship.length > 0) {
      return res.status(400).json({ error: "Already friends" });
    }

    // 检查是否已经有待处理的申请
    const existingRequest = await db
      .select()
      .from(friendRequests)
      .where(
        and(
          or(
            and(
              eq(friendRequests.fromUserId, userId),
              eq(friendRequests.toUserId, toUserId)
            ),
            and(
              eq(friendRequests.fromUserId, toUserId),
              eq(friendRequests.toUserId, userId)
            )
          ),
          eq(friendRequests.status, "pending")
        )
      );

    if (existingRequest.length > 0) {
      return res.status(400).json({ error: "Friend request already exists" });
    }

    // 创建好友申请
    const [newRequest] = await db
      .insert(friendRequests)
      .values({
        fromUserId: userId,
        toUserId,
        message,
        status: "pending",
      })
      .returning();

    res.json(newRequest);
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ error: "Failed to send friend request" });
  }
});

// 接受好友申请
router.post("/accept/:requestId", authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { requestId } = req.params;

    // 获取申请详情
    const [request] = await db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.id, requestId),
          eq(friendRequests.toUserId, userId),
          eq(friendRequests.status, "pending")
        )
      );

    if (!request) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    // 更新申请状态
    await db
      .update(friendRequests)
      .set({ status: "accepted" })
      .where(eq(friendRequests.id, requestId));

    // 创建双向好友关系
    await db.insert(friendships).values([
      {
        userId: request.fromUserId,
        friendId: userId,
        status: "accepted",
      },
      {
        userId: userId,
        friendId: request.fromUserId,
        status: "accepted",
      },
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({ error: "Failed to accept friend request" });
  }
});

// 拒绝好友申请
router.post("/reject/:requestId", authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { requestId } = req.params;

    const [request] = await db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.id, requestId),
          eq(friendRequests.toUserId, userId),
          eq(friendRequests.status, "pending")
        )
      );

    if (!request) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    await db
      .update(friendRequests)
      .set({ status: "rejected" })
      .where(eq(friendRequests.id, requestId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    res.status(500).json({ error: "Failed to reject friend request" });
  }
});

// 搜索用户
router.get("/search", authenticateUser, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Search query is required" });
    }

    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(user)
      .where(or(eq(user.email, q), eq(user.id, q)))
      .limit(10);

    res.json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Failed to search users" });
  }
});

export { router as friendsRouter };
