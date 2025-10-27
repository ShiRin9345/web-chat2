import { Server, Socket } from "socket.io";
import { onlineUserService } from "./onlineUsers.ts";
import { getUserFriendIds } from "../routes/friends.js";
import {
  createCallRecord,
  updateCallRecord,
  validateFriendship,
} from "./callRecords.js";
import { db } from "@workspace/database";
import {
  messages as messagesTable,
  user as userTable,
  groupMembers,
} from "@workspace/database/schema";
import { eq } from "drizzle-orm";

export class SocketService {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log("用户连接:", socket.id);

      // 用户上线
      socket.on("user:online", (userId) =>
        this.handleUserOnline(socket, userId)
      );

      // 发送消息
      socket.on("message:send", (data) => this.handleMessageSend(socket, data));

      // 群聊消息
      socket.on("group:message", (data) =>
        this.handleGroupMessage(socket, data)
      );

      // 好友申请
      socket.on("friend:request", (data) =>
        this.handleFriendRequest(socket, data)
      );

      // 获取在线好友状态
      socket.on("user:get-online-friends", (callback) =>
        this.handleGetOnlineFriends(socket, callback)
      );

      // 退出群聊
      socket.on("group:leave", (data) => this.handleGroupLeave(socket, data));

      // 用户断开连接
      socket.on("disconnect", () => this.handleDisconnect(socket));

      // ========== 通话相关事件 ==========
      socket.on("call:request", (data) => this.handleCallRequest(socket, data));
      socket.on("call:accept", (data) => this.handleCallAccept(socket, data));
      socket.on("call:reject", (data) => this.handleCallReject(socket, data));
      socket.on("call:connected", (data) =>
        this.handleCallConnected(socket, data)
      );
      socket.on("call:end", (data) => this.handleCallEnd(socket, data));

      // ========== WebRTC 信令事件 ==========
      socket.on("webrtc:offer", (data) => this.handleWebRTCOffer(socket, data));
      socket.on("webrtc:answer", (data) =>
        this.handleWebRTCAnswer(socket, data)
      );
      socket.on("webrtc:ice-candidate", (data) =>
        this.handleWebRTCIceCandidate(socket, data)
      );
    });
  }

  // ========== 用户相关事件处理 ==========

  private async handleUserOnline(socket: Socket, userId: string) {
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
          this.io.to(friendSocketId).emit("friend:online", userId);
        }
      }
    } catch (error) {
      console.error("获取好友列表失败:", error);
    }

    // 加入用户所属的所有群聊房间
    try {
      const userGroups = await db
        .select({ groupId: groupMembers.groupId })
        .from(groupMembers)
        .where(eq(groupMembers.userId, userId));

      for (const group of userGroups) {
        socket.join(`group:${group.groupId}`);
        console.log(`用户 ${userId} 加入群聊房间: group:${group.groupId}`);
      }
    } catch (error) {
      console.error("加入群聊房间失败:", error);
    }
  }

  private async handleMessageSend(
    socket: Socket,
    data: {
      recipientId: string;
      content: string;
      type?: "text" | "image" | "file";
      tempId?: string;
    }
  ) {
    console.log("收到消息:", data);
    const senderId = socket.data?.userId;

    if (!senderId) {
      console.error("发送者ID未知");
      return;
    }

    try {
      // 保存消息到数据库
      const [newMessage] = await db
        .insert(messagesTable)
        .values({
          content: data.content,
          senderId,
          recipientId: data.recipientId,
          type: data.type || "text",
          isRead: false,
        })
        .returning();

      if (!newMessage) {
        throw new Error("消息插入失败");
      }

      // 获取发送者信息
      const [sender] = await db
        .select({
          id: userTable.id,
          name: userTable.name,
          image: userTable.image,
          email: userTable.email,
          code: userTable.code,
        })
        .from(userTable)
        .where(eq(userTable.id, senderId))
        .limit(1);

      // 构造完整消息对象
      const messageWithSender = {
        ...newMessage,
        sender,
        tempId: data.tempId, // 保留临时ID用于客户端替换
      };

      // 推送给接收者
      this.io
        .to(`user:${data.recipientId}`)
        .emit("message:new", messageWithSender);

      // 也推送给发送者（用于多设备同步）
      socket.emit("message:new", messageWithSender);

      console.log("消息已保存并推送:", newMessage.id);
    } catch (error) {
      console.error("保存消息失败:", error);
      socket.emit("message:error", {
        tempId: data.tempId,
        error: "发送消息失败",
      });
    }
  }

  private async handleGroupMessage(
    socket: Socket,
    data: {
      groupId: string;
      content: string;
      type?: "text" | "image" | "file";
      tempId?: string;
    }
  ) {
    console.log("收到群聊消息:", data);
    const senderId = socket.data?.userId;

    if (!senderId) {
      console.error("发送者ID未知");
      return;
    }

    try {
      // 保存消息到数据库
      const [newMessage] = await db
        .insert(messagesTable)
        .values({
          content: data.content,
          senderId,
          groupId: data.groupId,
          type: data.type || "text",
          isRead: false, // 群聊消息通常不跟踪已读状态
        })
        .returning();

      if (!newMessage) {
        throw new Error("消息插入失败");
      }

      // 获取发送者信息
      const [sender] = await db
        .select({
          id: userTable.id,
          name: userTable.name,
          image: userTable.image,
          email: userTable.email,
          code: userTable.code,
        })
        .from(userTable)
        .where(eq(userTable.id, senderId))
        .limit(1);

      // 构造完整消息对象
      const messageWithSender = {
        ...newMessage,
        sender,
        tempId: data.tempId,
      };

      // 推送给群组所有成员
      this.io
        .to(`group:${data.groupId}`)
        .emit("message:new", messageWithSender);

      // 也推送给发送者
      socket.emit("message:new", messageWithSender);

      console.log("群聊消息已保存并推送:", newMessage.id);
    } catch (error) {
      console.error("保存群聊消息失败:", error);
      socket.emit("message:error", {
        tempId: data.tempId,
        error: "发送消息失败",
      });
    }
  }

  private handleFriendRequest(_socket: Socket, data: any) {
    console.log("收到好友申请:", data);
    // TODO: 保存到数据库
    this.io.to(`user:${data.toUserId}`).emit("friend:request:new", data);
  }

  private async handleGetOnlineFriends(
    socket: Socket,
    callback: (friends: string[]) => void
  ) {
    try {
      const userId = socket.data?.userId;
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
  }

  private handleGroupLeave(socket: Socket, data: { groupId: string }) {
    const { groupId } = data;
    console.log(`用户退出群聊房间: group:${groupId}`);
    socket.leave(`group:${groupId}`);
  }

  private async handleDisconnect(socket: Socket) {
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
            this.io.to(friendSocketId).emit("friend:offline", userId);
          }
        }
      } catch (error) {
        console.error("获取好友列表失败:", error);
      }
    }
  }

  // ========== 通话相关事件处理 ==========

  private async handleCallRequest(
    socket: Socket,
    data: {
      roomId: string;
      fromUserId: string;
      toUserId: string;
      callType: "video" | "audio";
    }
  ) {
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
      this.io.to(receiverSocketId).emit("call:incoming", {
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

  private handleCallAccept(
    socket: Socket,
    data: { roomId: string; userId: string; recordId: string }
  ) {
    console.log("接受通话:", data);
    const { roomId, userId, recordId } = data;

    // 加入房间
    socket.join(roomId);

    // 通知对方已接受
    socket.to(roomId).emit("call:accepted", { userId, recordId });
  }

  private async handleCallReject(
    socket: Socket,
    data: { roomId: string; userId: string; recordId: string }
  ) {
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

  private async handleCallConnected(
    _socket: Socket,
    data: { recordId: string; userId: string }
  ) {
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

  private async handleCallEnd(
    socket: Socket,
    data: {
      roomId: string;
      userId: string;
      recordId: string;
      duration?: number;
      endReason: "hangup" | "rejected" | "timeout" | "cancelled";
      targetUserId?: string;
    }
  ) {
    console.log("结束通话:", data);
    const { roomId, userId, recordId, duration, endReason, targetUserId } =
      data;

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
      socket.to(roomId).emit("call:ended", { userId, endReason });

      // 如果提供了 targetUserId，也直接通知目标用户
      if (targetUserId) {
        const targetSocketId = onlineUserService.getSocketId(targetUserId);
        if (targetSocketId) {
          console.log("直接通知目标用户:", targetUserId, "通话已结束");
          this.io.to(targetSocketId).emit("call:ended", { userId, endReason });
        }
      }

      // 离开房间
      socket.leave(roomId);
    } catch (error) {
      console.error("更新通话记录失败:", error);
    }
  }

  // ========== WebRTC 信令事件处理 ==========

  private handleWebRTCOffer(
    socket: Socket,
    data: {
      roomId: string;
      offer: RTCSessionDescriptionInit;
      targetUserId: string;
    }
  ) {
    console.log("转发 WebRTC Offer 给用户:", data.targetUserId);
    const { offer, targetUserId } = data;

    // 转发给目标用户
    const targetSocketId = onlineUserService.getSocketId(targetUserId);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit("webrtc:receive-offer", {
        offer,
        fromUserId: socket.data?.userId,
      });
      console.log("Offer 已转发给:", targetSocketId);
    } else {
      console.error("目标用户不在线:", targetUserId);
    }
  }

  private handleWebRTCAnswer(
    socket: Socket,
    data: {
      roomId: string;
      answer: RTCSessionDescriptionInit;
      targetUserId: string;
    }
  ) {
    console.log("转发 WebRTC Answer 给用户:", data.targetUserId);
    const { answer, targetUserId } = data;

    // 转发给目标用户
    const targetSocketId = onlineUserService.getSocketId(targetUserId);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit("webrtc:receive-answer", {
        answer,
        fromUserId: socket.data?.userId,
      });
      console.log("Answer 已转发给:", targetSocketId);
    } else {
      console.error("目标用户不在线:", targetUserId);
    }
  }

  private handleWebRTCIceCandidate(
    socket: Socket,
    data: {
      roomId: string;
      candidate: RTCIceCandidateInit;
      targetUserId: string;
    }
  ) {
    console.log("转发 ICE Candidate 给用户:", data.targetUserId);
    const { candidate, targetUserId } = data;

    // 转发给目标用户
    const targetSocketId = onlineUserService.getSocketId(targetUserId);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit("webrtc:receive-ice", {
        candidate,
        fromUserId: socket.data?.userId,
      });
    }
  }
}
