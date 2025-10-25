import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { createServer } from "http";
import { Server } from "socket.io";
import { auth } from "@/auth.ts";
import { ossRouter } from "@/routes/oss.ts";
import { friendsRouter, getUserFriendIds } from "@/routes/friends.ts";
import { groupsRouter } from "@/routes/groups.ts";
import { callsRouter } from "@/routes/calls.ts";
import { onlineUserService } from "@/services/onlineUsers.ts";
import {
  createCallRecord,
  updateCallRecord,
  validateFriendship,
} from "@/services/callRecords.ts";
config({ path: ".env.local" });

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Socket.io 配置
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
// Better Auth handler - Express v5 语法
app.all("/api/auth/*splat", toNodeHandler(auth));

// 重要：express.json() 必须在 Better Auth handler 之后
app.use(express.json());
app.use("/api/oss", ossRouter);
app.use("/api/friends", friendsRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/calls", callsRouter);

app.get("/check", (_req, res) => {
  res.send("Hello World");
});

// Socket.io 事件处理
io.on("connection", (socket) => {
  console.log("用户连接:", socket.id);

  // 用户上线
  socket.on("user:online", async (userId) => {
    console.log("用户上线:", userId);
    socket.join(`user:${userId}`);

    // 存储用户ID到socket中
    socket.data = { userId };

    // 添加到在线用户服务
    onlineUserService.addUser(userId, socket.id);

    // 获取该用户的所有好友
    try {
      const friendIds = await getUserFriendIds(userId);

      // 通知所有在线好友该用户上线
      for (const friendId of friendIds) {
        const friendSocketId = onlineUserService.getSocketId(friendId);
        if (friendSocketId) {
          io.to(friendSocketId).emit("friend:online", userId);
        }
      }
    } catch (error) {
      console.error("获取好友列表失败:", error);
    }
  });

  // 发送消息
  socket.on("message:send", (data) => {
    console.log("收到消息:", data);
    // TODO: 保存到数据库
    // 推送给接收者
    if (data.recipientId) {
      io.to(`user:${data.recipientId}`).emit("message:new", data);
    }
  });

  // 群聊消息
  socket.on("group:message", (data) => {
    console.log("收到群聊消息:", data);
    // TODO: 保存到数据库
    io.to(`group:${data.groupId}`).emit("message:new", data);
  });

  // 好友申请
  socket.on("friend:request", (data) => {
    console.log("收到好友申请:", data);
    // TODO: 保存到数据库
    io.to(`user:${data.toUserId}`).emit("friend:request:new", data);
  });

  // 获取在线好友状态
  socket.on("user:get-online-friends", async (callback) => {
    try {
      // 这里需要从 socket 中获取当前用户ID，暂时使用一个占位符
      // 在实际应用中，应该在连接时存储用户ID到socket
      const userId = socket.data?.userId; // 需要在前端连接时传递
      if (!userId) {
        callback([]);
        return;
      }

      const friendIds = await getUserFriendIds(userId);
      const onlineFriendIds = onlineUserService.getOnlineFriends(friendIds);
      callback(onlineFriendIds);
    } catch (error) {
      console.error("获取在线好友失败:", error);
      callback([]);
    }
  });

  // 用户断开连接
  socket.on("disconnect", async () => {
    console.log("用户断开连接:", socket.id);

    // 从在线用户服务中移除用户
    const userId = onlineUserService.removeUserBySocketId(socket.id);

    if (userId) {
      // 获取该用户的所有好友
      try {
        const friendIds = await getUserFriendIds(userId);

        // 通知所有在线好友该用户下线
        for (const friendId of friendIds) {
          const friendSocketId = onlineUserService.getSocketId(friendId);
          if (friendSocketId) {
            io.to(friendSocketId).emit("friend:offline", userId);
          }
        }
      } catch (error) {
        console.error("获取好友列表失败:", error);
      }
    }
  });

  // ========== 通话相关事件 ==========

  // 发起通话请求
  socket.on(
    "call:request",
    async (data: {
      roomId: string;
      fromUserId: string;
      toUserId: string;
      callType: "video" | "audio";
    }) => {
      console.log("收到通话请求:", data);
      const { roomId, fromUserId, toUserId, callType } = data;

      try {
        // 验证好友关系
        const isFriend = await validateFriendship(fromUserId, toUserId);
        if (!isFriend) {
          socket.emit("call:error", { message: "仅支持与好友进行通话" });
          return;
        }

        // 检查对方是否在线
        const receiverSocketId = onlineUserService.getSocketId(toUserId);
        if (!receiverSocketId) {
          socket.emit("call:error", { message: "对方当前不在线" });
          return;
        }

        // 创建通话记录
        const record = await createCallRecord({
          roomId,
          callerId: fromUserId,
          receiverId: toUserId,
          callType,
        });

        if (!record) {
          socket.emit("call:error", { message: "创建通话记录失败" });
          return;
        }

        // 发起方加入房间
        socket.join(roomId);

        // 返回记录ID给双方
        socket.emit("call:record-created", { recordId: record.id });

        // 推送来电通知给接收方
        io.to(receiverSocketId).emit("call:incoming", {
          roomId,
          fromUserId,
          callType,
          recordId: record.id,
        });
      } catch (error) {
        console.error("创建通话记录失败:", error);
        socket.emit("call:error", { message: "发起通话失败" });
      }
    }
  );

  // 接受通话
  socket.on(
    "call:accept",
    (data: { roomId: string; userId: string; recordId: string }) => {
      console.log("接受通话:", data);
      const { roomId, userId, recordId } = data;

      // 加入房间
      socket.join(roomId);

      // 通知对方已接受
      socket.to(roomId).emit("call:accepted", { userId, recordId });
    }
  );

  // 拒绝通话
  socket.on(
    "call:reject",
    async (data: { roomId: string; userId: string; recordId: string }) => {
      console.log("拒绝通话:", data);
      const { roomId, userId, recordId } = data;

      try {
        // 更新通话记录
        await updateCallRecord({
          recordId,
          status: "rejected",
          endedAt: new Date(),
        });

        // 通知对方已拒绝
        socket.to(roomId).emit("call:rejected", { userId });
      } catch (error) {
        console.error("更新通话记录失败:", error);
      }
    }
  );

  // 通话已连接（WebRTC 建立成功）
  socket.on(
    "call:connected",
    async (data: { recordId: string; userId: string }) => {
      console.log("通话已连接:", data);
      const { recordId } = data;

      try {
        // 更新通话记录
        await updateCallRecord({
          recordId,
          startedAt: new Date(),
        });
      } catch (error) {
        console.error("更新通话记录失败:", error);
      }
    }
  );

  // 结束通话
  socket.on(
    "call:end",
    async (data: {
      roomId: string;
      userId: string;
      recordId: string;
      duration?: number;
      endReason: "hangup" | "rejected" | "timeout" | "cancelled";
    }) => {
      console.log("结束通话:", data);
      const { roomId, userId, recordId, duration, endReason } = data;

      try {
        // 确定状态
        let status: "completed" | "missed" | "rejected" | "cancelled";
        switch (endReason) {
          case "hangup":
            status = "completed";
            break;
          case "rejected":
            status = "rejected";
            break;
          case "timeout":
            status = "missed";
            break;
          case "cancelled":
            status = "cancelled";
            break;
          default:
            status = "completed";
        }

        // 更新通话记录
        await updateCallRecord({
          recordId,
          status,
          endedAt: new Date(),
          duration: duration || 0,
        });

        // 通知对方通话已结束
        socket.to(roomId).emit("call:ended", { userId });

        // 离开房间
        socket.leave(roomId);
      } catch (error) {
        console.error("更新通话记录失败:", error);
      }
    }
  );

  // WebRTC 信令 - Offer
  socket.on(
    "webrtc:offer",
    (data: {
      roomId: string;
      offer: RTCSessionDescriptionInit;
      targetUserId: string;
    }) => {
      console.log("转发 WebRTC Offer 给用户:", data.targetUserId);
      const { roomId, offer, targetUserId } = data;

      // 转发给目标用户
      const targetSocketId = onlineUserService.getSocketId(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc:receive-offer", {
          offer,
          fromUserId: socket.data?.userId,
        });
        console.log("Offer 已转发给:", targetSocketId);
      } else {
        console.error("目标用户不在线:", targetUserId);
      }
    }
  );

  // WebRTC 信令 - Answer
  socket.on(
    "webrtc:answer",
    (data: {
      roomId: string;
      answer: RTCSessionDescriptionInit;
      targetUserId: string;
    }) => {
      console.log("转发 WebRTC Answer 给用户:", data.targetUserId);
      const { roomId, answer, targetUserId } = data;

      // 转发给目标用户
      const targetSocketId = onlineUserService.getSocketId(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc:receive-answer", {
          answer,
          fromUserId: socket.data?.userId,
        });
        console.log("Answer 已转发给:", targetSocketId);
      } else {
        console.error("目标用户不在线:", targetUserId);
      }
    }
  );

  // WebRTC 信令 - ICE Candidate
  socket.on(
    "webrtc:ice-candidate",
    (data: {
      roomId: string;
      candidate: RTCIceCandidateInit;
      targetUserId: string;
    }) => {
      console.log("转发 ICE Candidate 给用户:", data.targetUserId);
      const { roomId, candidate, targetUserId } = data;

      // 转发给目标用户
      const targetSocketId = onlineUserService.getSocketId(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc:receive-ice", {
          candidate,
          fromUserId: socket.data?.userId,
        });
      }
    }
  );
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
