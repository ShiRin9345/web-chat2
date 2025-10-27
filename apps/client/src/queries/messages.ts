import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import type { Message, User } from "@workspace/database";

const API_BASE = "http://localhost:3001/api";

// 消息类型（带发送者信息）
export type MessageWithSender = Message & {
  sender: Pick<User, "id" | "name" | "image">;
};

// 分页响应类型
export type MessagesPageResponse = {
  messages: MessageWithSender[];
  nextCursor: string | null;
  hasMore: boolean;
};

// 获取消息列表（无限滚动分页）
export function useMessages(chatId: string) {
  return useInfiniteQuery<MessagesPageResponse>({
    queryKey: ["messages", chatId],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        chatId,
        limit: "50",
      });

      if (pageParam) {
        params.append("cursor", pageParam as string);
      }

      const response = await axios.get(
        `${API_BASE}/messages?${params.toString()}`,
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    enabled: !!chatId,
    staleTime: 30000, // 30秒内数据视为新鲜
    refetchOnWindowFocus: false,
  });
}

// 标记消息为已读
export function useMarkMessageAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const response = await axios.post(
        `${API_BASE}/messages/read/${messageId}`,
        {},
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      // 可以选择性地更新缓存
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

// 批量标记消息为已读
export function useMarkMessagesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chatId: string) => {
      const response = await axios.post(
        `${API_BASE}/messages/read-batch`,
        { chatId },
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    onSuccess: (_, chatId) => {
      // 更新对应聊天的消息缓存
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
    },
  });
}
