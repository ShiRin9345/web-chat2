import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { socket } from "@/lib/socket";
import { authClient } from "@/lib/auth-client";
import { useConversationsStore } from "@/stores/conversations";
import type { MessageWithSender } from "@/queries/messages";

interface SocketContextType {
  isConnected: boolean;
  onlineUsers: Set<string>;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const currentUserIdRef = useRef<string>("");

  useEffect(() => {
    if (!session?.user) return;

    currentUserIdRef.current = session.user.id;

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
      // 连接成功时，从服务器恢复离线未读计数
      const store = useConversationsStore.getState();
      store.restoreUnreadCountsFromServer();
    };

    const handleDisconnect = () => {
      console.log("Socket 断开连接");
      setIsConnected(false);
    };

    // 监听新消息（全局处理，无论用户在哪个路由）
    const handleNewMessageGlobal = (message: MessageWithSender) => {
      const store = useConversationsStore.getState();
      store.handleNewMessage(message, currentUserIdRef.current);
    };

    // 监听好友请求被接受的事件
    const handleFriendRequestAccepted = () => {
      console.log(
        "好友请求被接受，正在重新加载好友列表、会话列表和好友请求列表"
      );
      // 使好友列表、会话列表和好友请求列表失效，触发重新查询
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    };

    // 监听接收到新好友请求的事件
    const handleFriendRequestNew = () => {
      console.log("接收到新的好友请求，正在重新加载好友请求列表");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    };

    // 监听好友请求被拒绝的事件
    const handleFriendRequestRejected = () => {
      console.log("好友请求被拒绝，正在重新加载好友请求列表");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    };

    // 监听好友被删除的事件
    const handleFriendRemoved = (data: { removedFriendId: string; isInitiator: boolean }) => {
      const { removedFriendId, isInitiator } = data;
      console.log(
        `好友 ${removedFriendId} 已被删除（isInitiator: ${isInitiator}），正在重新加载好友列表和会话列表`
      );
      
      // 仅当用户是被删除方（isInitiator 为 false）时，才显示提示并跳转
      if (!isInitiator) {
        // 获取当前打开的聊天ID
        const { currentChatId } = useConversationsStore.getState();
        const chatIdWithPrefix = `friend-${removedFriendId}`;
        
        // 检查用户是否正在与被删除的好友聊天
        if (currentChatId === chatIdWithPrefix) {
          // 显示友好提示
          alert("您已被该好友删除，将返回消息列表");
          // 自动跳转到消息列表主页面
          navigate({ to: "/messages" });
        }
      }
      
      // 无论是删除方还是被删除方，都需要使好友列表、会话列表失效，触发重新查询
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    };

    // 注册事件监听器
    socket.on("friend:online", handleFriendOnline);
    socket.on("friend:offline", handleFriendOffline);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("message:new", handleNewMessageGlobal);
    socket.on("friend-request:accepted", handleFriendRequestAccepted);
    socket.on("friend-request:rejected", handleFriendRequestRejected);
    socket.on("friend-request:new", handleFriendRequestNew);
    socket.on("friend:removed", handleFriendRemoved);

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
      socket.off("message:new", handleNewMessageGlobal);
      socket.off("friend-request:accepted", handleFriendRequestAccepted);
      socket.off("friend-request:rejected", handleFriendRequestRejected);
      socket.off("friend-request:new", handleFriendRequestNew);
      socket.off("friend:removed", handleFriendRemoved);
      socket.disconnect();
      setIsConnected(false);
    };
  }, [session?.user?.id, queryClient, navigate]);

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
