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
import { onlineUserService } from "@/services/onlineUsers.ts";
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
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
