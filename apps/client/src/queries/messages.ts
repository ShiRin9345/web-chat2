import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import type { Message, User } from "@workspace/database";

const API_BASE = "http://localhost:3001/api";

// 临时消息类型（与 MessageWithSender 兼容）
export type TempMessage = MessageWithSender;

// 消息类型（带发送者信息）
export type MessageWithSender = Message & {
  sender: Pick<User, "id" | "name" | "image">;
  tempId?: string; // 用于乐观更新的临时ID
  isPending?: boolean; // 是否正在发送中
  isFailed?: boolean; // 是否发送失败
};

// 分页响应类型
export type MessagesPageResponse = {
  messages: MessageWithSender[];
  nextCursor: string | null;
  hasMore: boolean;
};

// 获取消息列表（无限滚动分页）
export function useMessages(chatId: string) {
  const query = useInfiniteQuery<MessagesPageResponse>({
    queryKey: ["messages", chatId],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        chatId,
        limit: "20",
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

  return query;
}

// 将分页消息转换为渲染数组（旧消息在前，新消息在后）
export function transformMessagesToRenderArray(
  pages: MessagesPageResponse[] | undefined
): MessageWithSender[] {
  if (!pages || pages.length === 0) return [];

  // 1. 反转每页内部的消息顺序（降序 → 升序）
  const reversedPages = pages.map((page) => ({
    ...page,
    messages: [...page.messages].reverse(),
  }));

  // 2. 反转页面顺序（让最早的页在前）
  const orderedPages = [...reversedPages].reverse();

  // 3. 展平为一维数组
  return orderedPages.flatMap((page) => page.messages);
}

// 检查消息是否已存在于缓存中
export function isMessageInCache(
  pages: MessagesPageResponse[] | undefined,
  messageId: string
): boolean {
  if (!pages) return false;
  return pages.some((page) =>
    page.messages.some((msg) => msg.id === messageId)
  );
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

// 会话信息类型
export type ConversationInfo = {
  conversationId: string;
  lastMessage: string;
  lastMessageTime: Date;
  lastMessageType: string;
  unreadCount: number;
};

// 获取会话列表的最新消息
export function useConversations() {
  return useInfiniteQuery<ConversationInfo[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/messages/conversations`, {
        withCredentials: true,
      });
      return response.data;
    },
    getNextPageParam: () => undefined,
    initialPageParam: undefined,
    staleTime: 10000, // 10秒缓存
    refetchOnWindowFocus: true,
  });
}
