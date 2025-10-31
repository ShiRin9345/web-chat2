import { Server, Socket } from "socket.io";
import { onlineUserService } from "./onlineUsers";
import { getUserFriendIds } from "../routes/friends";
import {
  createCallRecord,
  updateCallRecord,
  validateFriendship,
} from "./callRecords";
import { db } from "@workspace/database";
import {
  messages as messagesTable,
  user as userTable,
  groupMembers,
  unreadMessages as unreadMessagesTable,
  groups as groupsTable,
} from "@workspace/database";
import { eq, and, inArray } from "drizzle-orm";

interface ActiveGroupCall {
  roomId: string;
  participants: Set<string>;
  callType: "video" | "audio";
}

export class SocketService {
  private io: Server;
  // 追踪活跃的群组通话
  private activeGroupCalls = new Map<string, ActiveGroupCall>();

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

      // ========== 群组通话相关事件 ==========
      socket.on("group:call:request", (data) =>
        this.handleGroupCallRequest(socket, data)
      );
      socket.on("group:call:accept", (data) =>
        this.handleGroupCallAccept(socket, data)
      );
      socket.on("group:call:reject", (data) =>
        this.handleGroupCallReject(socket, data)
      );
      socket.on("group:call:join", (data) =>
        this.handleGroupCallJoin(socket, data)
      );
      socket.on("group:call:leave", (data) =>
        this.handleGroupCallLeave(socket, data)
      );

      // ========== 群组 WebRTC 信令事件 ==========
      socket.on("group:webrtc:offer", (data) =>
        this.handleGroupWebRTCOffer(socket, data)
      );
      socket.on("group:webrtc:answer", (data) =>
        this.handleGroupWebRTCAnswer(socket, data)
      );
      socket.on("group:webrtc:ice-candidate", (data) =>
        this.handleGroupWebRTCIceCandidate(socket, data)
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

      // 检查接收者是否在线
      const recipientSocketId = onlineUserService.getSocketId(data.recipientId);
      if (!recipientSocketId) {
        // 接收者离线，更新未读计数
        const existing = await db
          .select()
          .from(unreadMessagesTable)
          .where(
            and(
              eq(unreadMessagesTable.userId, data.recipientId),
              eq(unreadMessagesTable.senderId, senderId)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // 更新现有记录
          await db
            .update(unreadMessagesTable)
            .set({
              unreadCount: existing[0].unreadCount + 1,
              lastMessageTime: newMessage.createdAt,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(unreadMessagesTable.userId, data.recipientId),
                eq(unreadMessagesTable.senderId, senderId)
              )
            );
        } else {
          // 创建新记录
          await db.insert(unreadMessagesTable).values({
            userId: data.recipientId,
            senderId,
            unreadCount: 1,
            lastMessageTime: newMessage.createdAt,
          });
        }
        console.log(`用户 ${data.recipientId} 离线，已记录未读计数`);
      } else {
        // 接收者在线，直接推送消息
        this.io
          .to(`user:${data.recipientId}`)
          .emit("message:new", messageWithSender);
      }

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
        tempId: data.tempId,
      };

      // 推送给群组所有成员
      this.io
        .to(`group:${data.groupId}`)
        .emit("message:new", messageWithSender);

      // 也推送给发送者
      socket.emit("message:new", messageWithSender);

      // ========== 处理群聊消息的离线未读计数 ==========
      // 获取该群组的所有成员
      const groupMembers_ = await db
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, data.groupId));

      // 为每个不在线的成员记录未读计数
      for (const member of groupMembers_) {
        // 跳过发送者
        if (member.userId === senderId) {
          continue;
        }

        // 检查成员是否在线
        const memberSocketId = onlineUserService.getSocketId(member.userId);
        if (!memberSocketId) {
          // 成员离线，记录未读计数
          const existing = await db
            .select()
            .from(unreadMessagesTable)
            .where(
              and(
                eq(unreadMessagesTable.userId, member.userId),
                eq(unreadMessagesTable.groupId, data.groupId)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            // 更新现有记录
            await db
              .update(unreadMessagesTable)
              .set({
                unreadCount: existing[0].unreadCount + 1,
                lastMessageTime: newMessage.createdAt,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(unreadMessagesTable.userId, member.userId),
                  eq(unreadMessagesTable.groupId, data.groupId)
                )
              );
          } else {
            // 创建新记录
            await db.insert(unreadMessagesTable).values({
              userId: member.userId,
              groupId: data.groupId,
              unreadCount: 1,
              lastMessageTime: newMessage.createdAt,
            });
          }
          console.log(
            `[群聊] 用户 ${member.userId} 离线，已记录群组 ${data.groupId} 的未读计数`
          );
        }
      }

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

  // ========== 群组通话相关事件处理 ==========

  /**
   * 验证用户是否为群组成员
   */
  private async validateGroupMembership(
    userId: string,
    groupId: string
  ): Promise<boolean> {
    try {
      const membership = await db
        .select()
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, userId)
          )
        )
        .limit(1);

      return membership.length > 0;
    } catch (error) {
      console.error("验证群组成员身份失败:", error);
      return false;
    }
  }

  /**
   * 获取群组所有成员ID
   */
  private async getGroupMemberIds(groupId: string): Promise<string[]> {
    try {
      const members = await db
        .select({ userId: groupMembers.userId })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, groupId));

      return members.map((m) => m.userId);
    } catch (error) {
      console.error("获取群组成员失败:", error);
      return [];
    }
  }

  /**
   * 获取群组活跃通话状态（公共方法）
   */
  public getGroupCallStatus(groupId: string): {
    isActive: boolean;
    participantsCount: number;
    callType: "video" | "audio" | null;
    roomId: string | null;
  } {
    const call = this.activeGroupCalls.get(groupId);
    if (!call) {
      return {
        isActive: false,
        participantsCount: 0,
        callType: null,
        roomId: null,
      };
    }

    return {
      isActive: true,
      participantsCount: call.participants.size,
      callType: call.callType,
      roomId: call.roomId,
    };
  }

  /**
   * 广播群组通话状态给所有群成员
   */
  private broadcastGroupCallStatus(groupId: string) {
    const call = this.activeGroupCalls.get(groupId);
    if (!call) return;

    const status = {
      groupId,
      participantsCount: call.participants.size,
      callType: call.callType,
      roomId: call.roomId,
      isActive: true,
    };

    // 广播给所有群成员（无论是否在通话中）
    this.io.to(`group:${groupId}`).emit("group:call:status", status);
  }

  /**
   * 处理群组通话请求
   */
  private async handleGroupCallRequest(
    socket: Socket,
    data: {
      roomId: string;
      groupId: string;
      fromUserId: string;
      callType: "video" | "audio";
    }
  ) {
    console.log("收到群组通话请求:", data);
    const { roomId, groupId, fromUserId, callType } = data;

    try {
      // 验证群组成员身份
      const isMember = await this.validateGroupMembership(fromUserId, groupId);
      if (!isMember) {
        socket.emit("group:call:error", {
          message: "您不是该群组成员",
        });
        return;
      }

      // 创建通话记录
      const record = await createCallRecord({
        roomId,
        callerId: fromUserId,
        groupId,
        callType,
      });

      if (!record) {
        socket.emit("group:call:error", {
          message: "创建通话记录失败",
        });
        return;
      }

      // 初始化活跃群组通话
      const activeCall: ActiveGroupCall = {
        roomId,
        participants: new Set([fromUserId]),
        callType,
      };
      this.activeGroupCalls.set(groupId, activeCall);

      // 发起方加入房间
      socket.join(roomId);

      // 返回记录ID
      socket.emit("group:call:record-created", { recordId: record.id });

      // 获取群组所有成员
      const memberIds = await this.getGroupMemberIds(groupId);

      // 通知所有群成员（除发起者）
      const status = {
        groupId,
        participantsCount: 1,
        callType,
        roomId,
        fromUserId,
        recordId: record.id,
      };

      for (const memberId of memberIds) {
        if (memberId === fromUserId) continue;

        const memberSocketId = onlineUserService.getSocketId(memberId);
        if (memberSocketId) {
          this.io.to(memberSocketId).emit("group:call:incoming", status);
        }
      }

      // 广播状态
      this.broadcastGroupCallStatus(groupId);

      console.log(`群组 ${groupId} 通话已创建，当前参与者: 1`);
    } catch (error) {
      console.error("创建群组通话失败:", error);
      socket.emit("group:call:error", { message: "发起群组通话失败" });
    }
  }

  /**
   * 处理接受群组通话
   */
  private handleGroupCallAccept(
    socket: Socket,
    data: { roomId: string; groupId: string; userId: string; recordId: string }
  ) {
    console.log("接受群组通话:", data);
    const { roomId, groupId, userId } = data;

    const call = this.activeGroupCalls.get(groupId);
    if (!call) {
      socket.emit("group:call:error", { message: "群组通话不存在" });
      return;
    }

    // 加入通话
    call.participants.add(userId);
    socket.join(roomId);

    // 通知房间内其他成员有新成员加入
    socket.to(roomId).emit("group:call:participant-joined", {
      userId,
      groupId,
      roomId,
      participantsCount: call.participants.size,
    });

    // 广播状态更新
    this.broadcastGroupCallStatus(groupId);

    console.log(
      `用户 ${userId} 加入群组 ${groupId} 通话，当前参与者: ${call.participants.size}`
    );
  }

  /**
   * 处理拒绝群组通话（仅拒绝加入，不影响其他成员）
   */
  private handleGroupCallReject(
    socket: Socket,
    data: { groupId: string; userId: string; recordId: string }
  ) {
    console.log("拒绝群组通话:", data);
    const { groupId, userId } = data;

    // 拒绝不会影响通话，只是该用户不加入
    // 不需要更新参与者列表或广播状态
    console.log(`用户 ${userId} 拒绝加入群组 ${groupId} 的通话`);
  }

  /**
   * 处理加入已进行的群组通话
   */
  private async handleGroupCallJoin(
    socket: Socket,
    data: { roomId: string; groupId: string; userId: string }
  ) {
    console.log("加入群组通话:", data);
    const { roomId, groupId, userId } = data;

    try {
      // 验证群组成员身份
      const isMember = await this.validateGroupMembership(userId, groupId);
      if (!isMember) {
        socket.emit("group:call:error", {
          message: "您不是该群组成员",
        });
        return;
      }

      const call = this.activeGroupCalls.get(groupId);
      if (!call) {
        socket.emit("group:call:error", { message: "群组通话不存在" });
        return;
      }

      // 如果已经在参与者列表中，直接返回
      if (call.participants.has(userId)) {
        socket.emit("group:call:joined", {
          roomId,
          groupId,
          participantsCount: call.participants.size,
        });
        return;
      }

      // 加入通话
      call.participants.add(userId);
      socket.join(roomId);

      // 通知房间内其他成员有新成员加入
      socket.to(roomId).emit("group:call:participant-joined", {
        userId,
        groupId,
        roomId,
        participantsCount: call.participants.size,
      });

      // 确认加入
      socket.emit("group:call:joined", {
        roomId,
        groupId,
        participantsCount: call.participants.size,
      });

      // 广播状态更新
      this.broadcastGroupCallStatus(groupId);

      console.log(
        `用户 ${userId} 加入群组 ${groupId} 通话，当前参与者: ${call.participants.size}`
      );
    } catch (error) {
      console.error("加入群组通话失败:", error);
      socket.emit("group:call:error", { message: "加入群组通话失败" });
    }
  }

  /**
   * 处理离开群组通话
   */
  private handleGroupCallLeave(
    socket: Socket,
    data: { roomId: string; groupId: string; userId: string }
  ) {
    console.log("离开群组通话:", data);
    const { roomId, groupId, userId } = data;

    const call = this.activeGroupCalls.get(groupId);
    if (!call) {
      return;
    }

    // 移除参与者
    call.participants.delete(userId);
    socket.leave(roomId);

    // 通知房间内其他成员有成员离开
    socket.to(roomId).emit("group:call:participant-left", {
      userId,
      groupId,
      roomId,
      participantsCount: call.participants.size,
    });

    // 如果参与者为0，关闭通话
    if (call.participants.size === 0) {
      this.activeGroupCalls.delete(groupId);
      this.io.to(`group:${groupId}`).emit("group:call:end", {
        groupId,
        roomId,
        reason: "all-left",
      });
      console.log(`群组 ${groupId} 通话已关闭（参与者为0）`);
    } else {
      // 广播状态更新
      this.broadcastGroupCallStatus(groupId);
      console.log(
        `用户 ${userId} 离开群组 ${groupId} 通话，剩余参与者: ${call.participants.size}`
      );
    }
  }

  // ========== 群组 WebRTC 信令事件处理 ==========

  /**
   * 处理群组 WebRTC Offer
   */
  private handleGroupWebRTCOffer(
    socket: Socket,
    data: {
      roomId: string;
      groupId: string;
      offer: RTCSessionDescriptionInit;
      senderUserId: string;
      targetUserId: string;
    }
  ) {
    console.log(
      `群组 ${data.groupId} WebRTC Offer: ${data.senderUserId} -> ${data.targetUserId}`
    );
    const { offer, targetUserId, roomId } = data;

    // 转发给目标用户（在房间内）
    socket
      .to(roomId)
      .to(`user:${targetUserId}`)
      .emit("group:webrtc:receive-offer", {
        offer,
        senderUserId: data.senderUserId,
        targetUserId,
        roomId,
        groupId: data.groupId,
      });
  }

  /**
   * 处理群组 WebRTC Answer
   */
  private handleGroupWebRTCAnswer(
    socket: Socket,
    data: {
      roomId: string;
      groupId: string;
      answer: RTCSessionDescriptionInit;
      senderUserId: string;
      targetUserId: string;
    }
  ) {
    console.log(
      `群组 ${data.groupId} WebRTC Answer: ${data.senderUserId} -> ${data.targetUserId}`
    );
    const { answer, targetUserId, roomId } = data;

    // 转发给目标用户（在房间内）
    socket
      .to(roomId)
      .to(`user:${targetUserId}`)
      .emit("group:webrtc:receive-answer", {
        answer,
        senderUserId: data.senderUserId,
        targetUserId,
        roomId,
        groupId: data.groupId,
      });
  }

  /**
   * 处理群组 WebRTC ICE Candidate
   */
  private handleGroupWebRTCIceCandidate(
    socket: Socket,
    data: {
      roomId: string;
      groupId: string;
      candidate: RTCIceCandidateInit;
      senderUserId: string;
      targetUserId: string;
    }
  ) {
    console.log(
      `群组 ${data.groupId} ICE Candidate: ${data.senderUserId} -> ${data.targetUserId}`
    );
    const { candidate, targetUserId, roomId } = data;

    // 转发给目标用户（在房间内）
    socket
      .to(roomId)
      .to(`user:${targetUserId}`)
      .emit("group:webrtc:receive-ice", {
        candidate,
        senderUserId: data.senderUserId,
        targetUserId,
        roomId,
        groupId: data.groupId,
      });
  }
}
