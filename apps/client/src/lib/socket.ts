import { io } from "socket.io-client";
import { SOCKET_URL } from "@/lib/api-config";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
});

// 消息相关的事件
export const messageEvents = {
  // 发送消息
  sendMessage: (data: {
    recipientId?: string;
    groupId?: string;
    content: string;
    type?: string;
  }) => {
    if (data.recipientId) {
      socket.emit("message:send", data);
    } else if (data.groupId) {
      socket.emit("group:message", data);
    }
  },

  // 监听新消息
  onNewMessage: (callback: (data: any) => void) => {
    socket.on("message:new", callback);
    return () => socket.off("message:new", callback);
  },
};

// 好友申请相关的事件
export const friendEvents = {
  // 发送好友申请
  sendFriendRequest: (data: { toUserId: string; message?: string }) => {
    socket.emit("friend:request", data);
  },

  // 监听好友申请
  onFriendRequest: (callback: (data: any) => void) => {
    socket.on("friend:request:new", callback);
    return () => socket.off("friend:request:new", callback);
  },
};

// 连接状态
export const connectionEvents = {
  onConnect: (callback: () => void) => {
    socket.on("connect", callback);
    return () => socket.off("connect", callback);
  },

  onDisconnect: (callback: () => void) => {
    socket.on("disconnect", callback);
    return () => socket.off("disconnect", callback);
  },
};
