import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { createServer } from "http";
import { Server } from "socket.io";
import { auth } from "./auth.ts";
import { ossRouter } from "./routes/oss.ts";
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

app.get("/check", (_req, res) => {
  res.send("Hello World");
});

// Socket.io 事件处理
io.on("connection", (socket) => {
  console.log("用户连接:", socket.id);

  // 用户上线
  socket.on("user:online", (userId) => {
    console.log("用户上线:", userId);
    socket.join(`user:${userId}`);
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

  // 用户断开连接
  socket.on("disconnect", () => {
    console.log("用户断开连接:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
