import { Router } from "express";
import { db, friendships, friendRequests, user } from "@workspace/database";
import { eq, and, or, like, ne } from "drizzle-orm";
import { authenticateUser } from "@/middleware/auth";
import { onlineUserService } from "@/services/onlineUsers";
const router = Router();

// 通知好友关系建立后的在线状态
export function notifyFriendOnlineStatus(
  io: any,
  userId1: string,
  userId2: string
) {
  // 检查双方是否都在线
  const socketId1 = onlineUserService.getSocketId(userId1);
  const socketId2 = onlineUserService.getSocketId(userId2);

  // 如果用户1在线，通知他用户2上线了
  if (socketId1) {
    io.to(socketId1).emit("friend:online", userId2);
  }

  // 如果用户2在线，通知他用户1上线了
  if (socketId2) {
    io.to(socketId2).emit("friend:online", userId1);
  }
}

// 获取用户的好友ID列表（用于在线状态广播）
export async function getUserFriendIds(userId: string): Promise<string[]> {
  const friends = await db
    .select({ friendId: friendships.friendId })
    .from(friendships)
    .where(
      and(eq(friendships.userId, userId), eq(friendships.status, "accepted"))
    );

  return friends.map((f) => f.friendId);
}

// 获取好友列表
router.get("/", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const friends = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        code: user.code,
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
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

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
          eq(friendRequests.toUserId, userId!),
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
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
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
              eq(friendRequests.fromUserId, userId!),
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
    const userId = req.user?.id;
    const { requestId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!requestId) {
      return res.status(400).json({ error: "Request ID is required" });
    }

    // 获取申请详情
    const [request] = await db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.id, requestId),
          eq(friendRequests.toUserId, userId!),
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

    // 通知双方好友关系建立后的在线状态
    // 通过 req.app.get('io') 获取 Socket.io 实例
    const io = req.app.get("io");
    if (io) {
      notifyFriendOnlineStatus(io, userId, request.fromUserId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({ error: "Failed to accept friend request" });
  }
});

// 拒绝好友申请
router.post("/reject/:requestId", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { requestId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!requestId) {
      return res.status(400).json({ error: "Request ID is required" });
    }

    const [request] = await db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.id, requestId),
          eq(friendRequests.toUserId, userId!),
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
    const { q: query } = req.query;
    const userId = req.user?.id;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ message: "搜索关键词不能为空" });
    }

    const searchPattern = `%${query}%`;

    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        code: user.code,
      })
      .from(user)
      .where(
        and(
          or(
            like(user.name, searchPattern),
            like(user.email, searchPattern),
            like(user.code, searchPattern)
          ),
          ne(user.id, userId!)
        )
      )
      .limit(20);

    res.json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Failed to search users" });
  }
});

// 获取单个用户信息
router.get("/user/:userId", authenticateUser, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const [userData] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(userData);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// 删除好友
router.delete("/:friendId", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { friendId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!friendId) {
      return res.status(400).json({ error: "Friend ID is required" });
    }

    if (userId === friendId) {
      return res.status(400).json({ error: "Cannot remove yourself" });
    }

    // 删除双向好友关系
    await db
      .delete(friendships)
      .where(
        or(
          and(
            eq(friendships.userId, userId),
            eq(friendships.friendId, friendId)
          ),
          and(
            eq(friendships.userId, friendId),
            eq(friendships.friendId, userId)
          )
        )
      );

    // 通知双方好友关系已解除
    const io = req.app.get("io");
    if (io) {
      const socketId1 = onlineUserService.getSocketId(userId);
      const socketId2 = onlineUserService.getSocketId(friendId);

      if (socketId1) {
        io.to(socketId1).emit("friend:removed", friendId);
      }

      if (socketId2) {
        io.to(socketId2).emit("friend:removed", userId);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error removing friend:", error);
    res.status(500).json({ error: "Failed to remove friend" });
  }
});

export { router as friendsRouter };
