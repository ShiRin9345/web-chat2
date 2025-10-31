import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Group } from "@workspace/database";
import type { MessageWithSender } from "@/queries/messages";
import { formatTimeAgo } from "@/utils/time";

export interface Conversation {
  id: string;
  name: string;
  avatar: string | null;
  type: "friend" | "group";
  lastMessage: string;
  time: string;
  unreadCount: number;
}

interface ConversationMapItem {
  lastMessage: string;
  time: string;
  unreadCount: number;
  messageType: string;
}

interface ConversationsState {
  conversations: Conversation[];
  conversationsMap: Map<string, ConversationMapItem>;
  searchQuery: string;
  // 当前打开的聊天ID
  currentChatId: string | null;
  // 加载状态
  isLoadingFriends: boolean;
  isLoadingGroups: boolean;
  isLoadingConversations: boolean;
  // 在线状态映射
  onlineStatus: Record<string, boolean>;
  // 未读计数快照（用于在synchronizeConversations中保留）
  unreadCountSnapshot: Record<string, number>;

  // 设置当前打开的聊天ID
  setCurrentChatId: (chatId: string | null) => void;

  // 设置搜索查询
  setSearchQuery: (query: string) => void;

  // 设置单个加载状态
  setLoadingStates: (
    isLoadingFriends: boolean,
    isLoadingGroups: boolean,
    isLoadingConversations: boolean
  ) => void;

  // 更新在线状态
  updateOnlineStatus: (userId: string, isOnline: boolean) => void;

  // 增加未读计数
  incrementUnreadCount: (conversationId: string) => void;

  // 清除未读计数
  clearUnreadCount: (conversationId: string) => void;

  // 更新最后消息
  updateLastMessage: (
    conversationId: string,
    message: string,
    time: string
  ) => void;

  // 处理新消息（WebSocket事件回调）
  handleNewMessage: (message: MessageWithSender, currentUserId: string) => void;

  // 更新未读计数快照
  updateUnreadCountSnapshot: () => void;

  // 综合更新方法：处理会话映射、列表生成和排序
  synchronizeConversations: (
    friends: User[] | undefined,
    groups: Group[] | undefined,
    conversationsData: any
  ) => void;

  // 获取整体加载状态
  getIsLoading: () => boolean;

  // 获取过滤后的会话列表
  getFilteredConversations: () => Conversation[];
}

export const useConversationsStore = create<ConversationsState>()(
  persist(
    (set, get) => ({
      conversations: [],
      conversationsMap: new Map(),
      searchQuery: "",
      currentChatId: null,
      isLoadingFriends: false,
      isLoadingGroups: false,
      isLoadingConversations: false,
      onlineStatus: {},
      unreadCountSnapshot: {},

      setCurrentChatId: (chatId: string | null) =>
        set({ currentChatId: chatId }),

      setSearchQuery: (query: string) => set({ searchQuery: query }),

      setLoadingStates: (
        isLoadingFriends: boolean,
        isLoadingGroups: boolean,
        isLoadingConversations: boolean
      ) =>
        set({
          isLoadingFriends,
          isLoadingGroups,
          isLoadingConversations,
        }),

      updateOnlineStatus: (userId: string, isOnline: boolean) =>
        set((state) => ({
          onlineStatus: {
            ...state.onlineStatus,
            [userId]: isOnline,
          },
        })),

      incrementUnreadCount: (conversationId: string) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, unreadCount: conv.unreadCount + 1 }
              : conv
          ),
        })),

      clearUnreadCount: (conversationId: string) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
          ),
        })),

      updateLastMessage: (
        conversationId: string,
        message: string,
        time: string
      ) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, lastMessage: message, time }
              : conv
          ),
        })),

      updateUnreadCountSnapshot: () =>
        set((state) => ({
          unreadCountSnapshot: state.conversations.reduce(
            (acc, conv) => ({
              ...acc,
              [conv.id]: conv.unreadCount,
            }),
            {}
          ),
        })),

      handleNewMessage: (message: MessageWithSender, currentUserId: string) => {
        // 格式化时间
        const timeAgo = formatTimeAgo(new Date(message.createdAt));

        // 格式化显示内容
        let displayMessage = message.content;
        if (message.type === "image") {
          displayMessage = "[图片]";
        } else if (message.type === "file") {
          displayMessage = "[文件]";
        }

        // 确定会话 ID
        let conversationId: string;
        if (message.groupId) {
          conversationId = `group-${message.groupId}`;
        } else {
          // 一对一聊天，使用对方的 ID
          const otherUserId =
            message.senderId === currentUserId
              ? message.recipientId
              : message.senderId;
          conversationId = `friend-${otherUserId}`;
        }

        // 更新最后消息
        get().updateLastMessage(conversationId, displayMessage, timeAgo);

        // 如果不是当前用户发送的消息
        if (message.senderId !== currentUserId) {
          // 只有在用户不在该聊天页面时，才增加未读计数
          const { currentChatId } = get();
          if (currentChatId !== conversationId) {
            get().incrementUnreadCount(conversationId);
            // 立即更新快照，确保WebSocket消息也能被持久化
            get().updateUnreadCountSnapshot();
          }
        }
      },

      synchronizeConversations: (
        friends: User[] | undefined,
        groups: Group[] | undefined,
        conversationsData: any
      ) => {
        // 步骤1：构建会话映射
        const conversationsMap = new Map<
          string,
          {
            lastMessage: string;
            time: string;
            unreadCount: number;
            messageType: string;
          }
        >();

        if (conversationsData?.pages?.[0]) {
          for (const conv of conversationsData.pages[0]) {
            const timeAgo = formatTimeAgo(new Date(conv.lastMessageTime));

            // 根据消息类型格式化显示内容
            let displayMessage = conv.lastMessage;
            if (conv.lastMessageType === "image") {
              displayMessage = "[图片]";
            } else if (conv.lastMessageType === "file") {
              displayMessage = "[文件]";
            }

            conversationsMap.set(conv.conversationId, {
              lastMessage: displayMessage,
              time: timeAgo,
              unreadCount: conv.unreadCount,
              messageType: conv.lastMessageType,
            });
          }
        }

        // 获取未读计数快照，用于保留本地增加的未读计数
        const { unreadCountSnapshot } = get();

        // 步骤2：合并好友和群组，生成会话列表
        const conversationsList = [
          ...(friends || []).map((friend) => {
            const convId = `friend-${friend.id}`;
            const convInfo = conversationsMap.get(convId);
            // 优先级：快照未读计数 > API未读计数 > 0
            const unreadCount =
              unreadCountSnapshot[convId] ?? (convInfo?.unreadCount || 0);
            return {
              id: convId,
              name: friend.name,
              avatar: friend.image,
              type: "friend" as const,
              lastMessage: convInfo?.lastMessage || "开始聊天吧",
              time: convInfo?.time || "",
              unreadCount,
            };
          }),
          ...(groups || []).map((group) => {
            const convId = `group-${group.id}`;
            const convInfo = conversationsMap.get(convId);
            // 优先级：快照未读计数 > API未读计数 > 0
            const unreadCount =
              unreadCountSnapshot[convId] ?? (convInfo?.unreadCount || 0);
            return {
              id: convId,
              name: group.name,
              avatar: group.avatar,
              type: "group" as const,
              lastMessage: convInfo?.lastMessage || "开始聊天吧",
              time: convInfo?.time || "",
              unreadCount,
            };
          }),
        ];

        // 步骤3：按最后消息时间排序（有消息的排在前）
        const sortedList = conversationsList.sort((a, b) => {
          if (!a.time && !b.time) return 0;
          if (!a.time) return 1;
          if (!b.time) return -1;
          return 0; // 已经通过 conversationsMap 排序过了
        });

        // 步骤4：更新状态
        set({
          conversationsMap,
          conversations: sortedList,
        });
      },

      getIsLoading: () => {
        const { isLoadingFriends, isLoadingGroups, isLoadingConversations } =
          get();
        return isLoadingFriends || isLoadingGroups || isLoadingConversations;
      },

      getFilteredConversations: () => {
        const { conversations, searchQuery } = get();
        if (!searchQuery) return conversations;

        const query = searchQuery.toLowerCase();
        return conversations.filter((conv) =>
          conv.name.toLowerCase().includes(query)
        );
      },
    }),
    {
      name: "conversations-storage",
      partialize: (state) => ({
        conversations: state.conversations,
        onlineStatus: state.onlineStatus,
        unreadCountSnapshot: state.unreadCountSnapshot,
      }),
      // 数据加载时的回调
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log(
            "[Zustand] Unread counts restored from localStorage:",
            state.unreadCountSnapshot
          );
        }
      },
    }
  )
);
