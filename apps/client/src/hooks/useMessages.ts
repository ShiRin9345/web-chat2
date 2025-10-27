import { useMessages as useMessagesQuery } from "@/queries/messages";
import { useMemo } from "react";
import type { MessageWithSender } from "@/queries/messages";

/**
 * 获取消息列表的 Hook
 * 基于 useInfiniteQuery，支持分页加载历史消息
 */
export function useMessages(chatId: string) {
  const query = useMessagesQuery(chatId);

  // 合并所有页的消息，保持正确的顺序
  // pages[0] 是最新的消息（第一页）
  // pages[1] 是更旧的消息（第二页）
  // 最终顺序：旧消息在上，新消息在下
  const allMessages = useMemo(() => {
    if (!query.data) return [];

    // 将所有页的消息合并
    // 每页内部已经是降序（新->旧），所以需要反转每一页
    // 然后按页面顺序拼接（后面的页是更旧的消息）
    const messages = query.data.pages
      .map((page) => [...page.messages].reverse()) // 每页内部反转
      .reverse() // 页面顺序反转，让旧的页在前面
      .flat(); // 展平

    return messages;
  }, [query.data]);

  return {
    messages: allMessages,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * 向消息列表添加新消息的辅助函数
 * 用于实时消息和乐观更新
 * 新消息应该添加到第一页的开头（因为第一页是降序的）
 */
export function addMessageToCache(
  queryClient: any,
  chatId: string,
  newMessage: MessageWithSender
) {
  queryClient.setQueryData(["messages", chatId], (oldData: any) => {
    if (!oldData) return oldData;

    // 将新消息添加到第一页的开头（最新位置）
    const newPages = [...oldData.pages];

    if (newPages.length > 0) {
      newPages[0] = {
        ...newPages[0],
        messages: [newMessage, ...newPages[0].messages],
      };
    } else {
      // 如果没有页面，创建第一页
      newPages.push({
        messages: [newMessage],
        nextCursor: null,
        hasMore: false,
      });
    }

    return {
      ...oldData,
      pages: newPages,
    };
  });
}

/**
 * 替换临时消息为真实消息
 * 用于发送消息成功后的更新
 */
export function replaceMessageInCache(
  queryClient: any,
  chatId: string,
  tempId: string,
  realMessage: MessageWithSender
) {
  queryClient.setQueryData(["messages", chatId], (oldData: any) => {
    if (!oldData) return oldData;

    const newPages = oldData.pages.map((page: any) => ({
      ...page,
      messages: page.messages.map((msg: any) =>
        msg.tempId === tempId ? realMessage : msg
      ),
    }));

    return {
      ...oldData,
      pages: newPages,
    };
  });
}

/**
 * 标记消息为已读
 */
export function markMessageAsReadInCache(
  queryClient: any,
  chatId: string,
  messageId: string
) {
  queryClient.setQueryData(["messages", chatId], (oldData: any) => {
    if (!oldData) return oldData;

    const newPages = oldData.pages.map((page: any) => ({
      ...page,
      messages: page.messages.map((msg: MessageWithSender) =>
        msg.id === messageId ? { ...msg, isRead: true } : msg
      ),
    }));

    return {
      ...oldData,
      pages: newPages,
    };
  });
}
