import React, { createContext, useContext, useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { authClient } from "@/lib/auth-client";

interface SocketContextType {
  isConnected: boolean;
  onlineUsers: Set<string>;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session?.user) return;

    // 连接 socket
    socket.connect();
    socket.emit("user:online", session.user.id);
    setIsConnected(true);

    // 监听好友上线
    const handleFriendOnline = (userId: string) => {
      console.log("好友上线:", userId);
      setOnlineUsers((prev) => new Set(prev).add(userId));
    };

    // 监听好友下线
    const handleFriendOffline = (userId: string) => {
      console.log("好友下线:", userId);
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    // 监听连接状态
    const handleConnect = () => {
      console.log("Socket 连接成功");
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log("Socket 断开连接");
      setIsConnected(false);
    };

    // 注册事件监听器
    socket.on("friend:online", handleFriendOnline);
    socket.on("friend:offline", handleFriendOffline);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // 初始化在线好友列表
    socket.emit("user:get-online-friends", (onlineFriendIds: string[]) => {
      console.log("获取到在线好友:", onlineFriendIds);
      setOnlineUsers(new Set(onlineFriendIds));
    });

    return () => {
      socket.off("friend:online", handleFriendOnline);
      socket.off("friend:offline", handleFriendOffline);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.disconnect();
      setIsConnected(false);
    };
  }, [session?.user?.id]);

  return (
    <SocketContext.Provider value={{ isConnected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within SocketProvider");
  }
  return context;
};

// 导出 socket 实例
export const useSocket = () => socket;
