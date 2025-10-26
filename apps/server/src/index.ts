import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { createServer } from "http";
import { Server } from "socket.io";
import { auth } from "@/auth.ts";
import { ossRouter } from "@/routes/oss.ts";
import { friendsRouter } from "@/routes/friends.ts";
import { groupsRouter } from "@/routes/groups.ts";
import { callsRouter } from "@/routes/calls.ts";
import { SocketService } from "@/services/socket.ts";
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

// 初始化 Socket 服务
new SocketService(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
