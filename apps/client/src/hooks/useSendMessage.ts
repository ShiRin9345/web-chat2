import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../providers/SocketProvider";
import type {
  MessageWithSender,
  MessagesPageResponse,
  TempMessage,
} from "../queries/messages";

export function useSendMessage(chatId: string, currentUserId: string) {
  const queryClient = useQueryClient();
  const socket = useSocket();

  const sendMessage = useCallback(
    (content: string, type: "text" | "image" | "file" = "text") => {
      if (!socket || !content.trim()) return;

      const isFriendChat = chatId.startsWith("friend-");
      const isGroupChat = chatId.startsWith("group-");

      // 生成临时消息
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const tempMessage: TempMessage = {
        id: tempId,
        tempId,
        content,
        type,
        senderId: currentUserId,
        recipientId: isFriendChat ? chatId.replace("friend-", "") : null,
        groupId: isGroupChat ? chatId.replace("group-", "") : null,
        isRead: false,
        isPending: true,
        createdAt: new Date(),
        sender: {
          id: currentUserId,
          name: "我", // 这里应该从用户状态中获取真实名称
          image: null,
        },
      };

      // 乐观更新：立即添加临时消息到缓存
      const queryKey = ["messages", chatId];
      queryClient.setQueryData<{
        pages: MessagesPageResponse[];
        pageParams: unknown[];
      }>(queryKey, (oldData) => {
        if (!oldData) {
          return {
            pages: [
              {
                messages: [tempMessage as MessageWithSender],
                nextCursor: null,
                hasMore: false,
              },
            ],
            pageParams: [undefined],
          };
        }

        const newPages = [...oldData.pages];
        const firstPage = newPages[0];
        if (firstPage) {
          newPages[0] = {
            messages: [tempMessage as MessageWithSender, ...firstPage.messages],
            nextCursor: firstPage.nextCursor,
            hasMore: firstPage.hasMore,
          };
        }

        return {
          ...oldData,
          pages: newPages,
        };
      });

      // 发送消息到服务器
      if (isGroupChat) {
        socket.emit("group:message", {
          groupId: chatId.replace("group-", ""),
          content,
          type,
          tempId,
        });
      } else {
        socket.emit("message:send", {
          recipientId: chatId.replace("friend-", ""),
          content,
          type,
          tempId,
        });
      }

      // 监听消息发送确认（可选：用于替换临时消息）
      // Socket 服务器会通过 'message:new' 事件推送真实消息
      // ChatMessages 组件会处理消息的去重和替换
    },
    [socket, chatId, currentUserId, queryClient]
  );

  return { sendMessage };
}
