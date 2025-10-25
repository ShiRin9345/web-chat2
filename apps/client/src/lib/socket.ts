import { io, Socket } from "socket.io-client";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";

export const socket = io("http://localhost:3001", {
  autoConnect: false,
  withCredentials: true,
});

// Socket 事件钩子
export function useSocket() {
  const { data: session } = authClient.useSession();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (session?.user) {
      socket.connect();
      socket.emit("user:online", session.user.id);
      setIsConnected(true);
    }

    return () => {
      socket.disconnect();
      setIsConnected(false);
    };
  }, [session]);

  return { socket, isConnected };
}

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
