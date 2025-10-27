import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/lib/socket";
import { addMessageToCache, markMessageAsReadInCache } from "./useMessages";
import type { MessageWithSender } from "@/queries/messages";

/**
 * 监听实时消息的 Hook
 * 自动将新消息添加到缓存
 */
export function useRealtimeMessages(
  chatId: string | null,
  currentUserId: string,
  onNewMessage?: (message: MessageWithSender) => void
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!chatId || !socket.connected) return;

    // 监听新消息
    const handleNewMessage = (message: MessageWithSender) => {
      console.log("Received new message:", message);

      // 检查消息是否属于当前聊天
      const [chatType, targetId] = chatId.split("-");
      
      let belongsToCurrentChat = false;
      
      if (chatType === "friend") {
        // 私聊：检查是否是与当前好友的对话
        belongsToCurrentChat =
          (message.senderId === targetId && message.recipientId === currentUserId) ||
          (message.senderId === currentUserId && message.recipientId === targetId);
      } else if (chatType === "group") {
        // 群聊：检查是否是当前群组的消息
        belongsToCurrentChat = message.groupId === targetId;
      }

      if (belongsToCurrentChat) {
        // 添加到当前聊天的缓存
        addMessageToCache(queryClient, chatId, message);

        // 如果是别人发的消息，标记为已读
        if (message.senderId !== currentUserId && message.id) {
          socket.emit("message:read", {
            messageId: message.id,
            recipientId: message.senderId,
          });
        }

        // 调用回调函数（用于滚动到底部等操作）
        onNewMessage?.(message);
      } else {
        // 消息属于其他聊天，更新未读计数
        // TODO: 实现未读消息计数功能
        console.log("Message from another chat");
      }
    };

    // 监听消息已送达事件
    const handleMessageDelivered = (data: { messageId: string }) => {
      console.log("Message delivered:", data.messageId);
      markMessageAsReadInCache(queryClient, chatId, data.messageId);
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:delivered", handleMessageDelivered);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:delivered", handleMessageDelivered);
    };
  }, [chatId, currentUserId, queryClient, onNewMessage]);
}

/**
 * 监听所有聊天的新消息（用于未读消息计数）
 */
export function useGlobalRealtimeMessages(currentUserId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket.connected) return;

    const handleNewMessage = (message: MessageWithSender) => {
      // 如果是别人发给我的消息，增加未读计数
      if (message.recipientId === currentUserId) {
        // TODO: 更新未读消息计数
        console.log("New unread message from:", message.senderId);
        
        // 可以在这里显示桌面通知
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("新消息", {
            body: `${message.sender.name}: ${message.content}`,
            icon: message.sender.image || undefined,
          });
        }
      }
    };

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [currentUserId, queryClient]);
}
