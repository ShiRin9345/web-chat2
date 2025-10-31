import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { createServer } from "http";
import { Server } from "socket.io";
import { auth } from "@/auth";
import { ossRouter } from "@/routes/oss";
import { friendsRouter } from "@/routes/friends";
import { groupsRouter } from "@/routes/groups";
import { callsRouter } from "@/routes/calls";
import { messagesRouter } from "@/routes/messages";
import { SocketService } from "@/services/socket";
config({ path: ".env.local" });

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Socket.io 配置
export const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://8.152.201.45"],
    credentials: true,
  },
});

// 将 Socket.io 实例存储到 Express 应用中，供路由使用
app.set("io", io);

app.use(
  cors({
    origin: ["http://localhost:3000", "http://8.152.201.45"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
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
app.use("/api/messages", messagesRouter);

app.get("/check", (_req, res) => {
  res.send("Hello World");
});

new SocketService(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
