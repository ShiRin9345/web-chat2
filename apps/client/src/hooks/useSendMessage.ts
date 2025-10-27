import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/lib/socket";
import { addMessageToCache, replaceMessageInCache } from "./useMessages";
import type { MessageWithSender } from "@/queries/messages";

/**
 * 发送消息的 Hook
 * 支持乐观更新和错误重试
 */
export function useSendMessage(chatId: string, currentUserId: string) {
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);

  const sendMessage = useCallback(
    async (content: string, type: string = "text") => {
      if (!content.trim() || !chatId) return;

      setIsSending(true);

      // 解析 chatId: friend-{userId} 或 group-{groupId}
      const [chatType, targetId] = chatId.split("-");

      // 生成临时 ID
      const tempId = `temp-${Date.now()}-${Math.random()}`;

      // 创建临时消息用于乐观更新
      const tempMessage: MessageWithSender = {
        id: tempId,
        content,
        senderId: currentUserId,
        recipientId: chatType === "friend" && targetId ? targetId : null,
        groupId: chatType === "group" && targetId ? targetId : null,
        type,
        isRead: false,
        createdAt: new Date(),
        sender: {
          id: currentUserId,
          name: "", // 将由实际数据填充
          image: null,
        },
      };

      // 乐观更新：立即添加到缓存
      addMessageToCache(queryClient, chatId, tempMessage);

      try {
        // 通过 WebSocket 发送消息
        const response = await new Promise<{
          success: boolean;
          message?: MessageWithSender;
          error?: string;
        }>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Send timeout"));
          }, 10000); // 10秒超时

          socket.emit(
            "message:send",
            {
              tempId,
              recipientId: chatType === "friend" ? targetId : undefined,
              groupId: chatType === "group" ? targetId : undefined,
              content,
              type,
            },
            (response: any) => {
              clearTimeout(timeout);
              if (response.error) {
                reject(new Error(response.error));
              } else {
                resolve(response);
              }
            }
          );
        });

        if (response.success && response.message) {
          // 替换临时消息为真实消息
          replaceMessageInCache(queryClient, chatId, tempId, response.message);
        }
      } catch (error) {
        console.error("Failed to send message:", error);

        // 发送失败：标记消息为失败状态
        // 可以添加重试按钮或移除临时消息
        queryClient.setQueryData(["messages", chatId], (oldData: any) => {
          if (!oldData) return oldData;

          const newPages = oldData.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((msg: any) =>
              msg.id === tempId
                ? { ...msg, _failed: true, _error: (error as Error).message }
                : msg
            ),
          }));

          return {
            ...oldData,
            pages: newPages,
          };
        });

        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [chatId, currentUserId, queryClient]
  );

  // 重试发送失败的消息
  const retryMessage = useCallback(
    async (failedMessage: MessageWithSender) => {
      // 移除失败标记
      queryClient.setQueryData(["messages", chatId], (oldData: any) => {
        if (!oldData) return oldData;

        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          messages: page.messages.filter(
            (msg: any) => msg.id !== failedMessage.id
          ),
        }));

        return {
          ...oldData,
          pages: newPages,
        };
      });

      // 重新发送
      await sendMessage(failedMessage.content, failedMessage.type);
    },
    [chatId, queryClient, sendMessage]
  );

  return {
    sendMessage,
    retryMessage,
    isSending,
  };
}
