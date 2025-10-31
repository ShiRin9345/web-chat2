import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@workspace/ui/components/resizable";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { ConversationHeader } from "@/components/ConversationHeader";
import { ConversationItem } from "@/components/ConversationItem";
import { ConversationEmptyState } from "@/components/ConversationEmptyState";
import { ConversationLoadingState } from "@/components/ConversationLoadingState";
import { useFriends } from "@/queries/friends";
import { useGroups } from "@/queries/groups";
import { useConversations } from "@/queries/messages";
import { useConversationsStore } from "@/stores/conversations";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesLayout,
});

function MessagesLayout() {
  const { data: friends, isLoading: isLoadingFriends } = useFriends();
  const { data: groups, isLoading: isLoadingGroups } = useGroups();
  const { data: conversationsData, isLoading: isLoadingConversations } =
    useConversations();
  const location = useLocation();

  // 使用 Zustand store
  const {
    searchQuery,
    setSearchQuery,
    setLoadingStates,
    synchronizeConversations,
    setCurrentChatId,
    clearUnreadCount,
    updateUnreadCountSnapshot,
    getIsLoading,
    getFilteredConversations,
  } = useConversationsStore();

  // 同步加载状态到 store
  useEffect(() => {
    setLoadingStates(isLoadingFriends, isLoadingGroups, isLoadingConversations);
  }, [
    isLoadingFriends,
    isLoadingGroups,
    isLoadingConversations,
    setLoadingStates,
  ]);

  // 跟踪当前打开的聊天ID
  useEffect(() => {
    const pathParts = location.pathname.split("/");
    const chatIdIndex = pathParts.indexOf("messages");
    const chatId =
      chatIdIndex !== -1 && chatIdIndex + 1 < pathParts.length
        ? pathParts[chatIdIndex + 1]
        : null;

    if (chatId) {
      setCurrentChatId(chatId);
      // 打开聊天页面时，清除该会话的未读计数
      clearUnreadCount(chatId);
      // 更新快照，确保未读计数被持久化
      updateUnreadCountSnapshot();
    } else {
      // 回到消息列表页面时，清除currentChatId
      setCurrentChatId(null);
    }
  }, [
    location.pathname,
    setCurrentChatId,
    clearUnreadCount,
    updateUnreadCountSnapshot,
  ]);

  // 同步会话数据（包括映射、列表生成、排序等）
  // ✅ 改进：在同步前保存当前未读计数，在同步后恢复
  useEffect(() => {
    // 关键改进：先保存快照再同步，确保未读计数不会被覆盖
    if (friends && groups) {
      synchronizeConversations(friends, groups, conversationsData);
      // 同步完成后立即更新快照，保证快照始终最新
      updateUnreadCountSnapshot();
    }
  }, [
    friends,
    groups,
    conversationsData,
    synchronizeConversations,
    updateUnreadCountSnapshot,
  ]);

  // 从 store 获取整体加载状态和过滤后的会话列表
  const isLoading = getIsLoading();
  const filteredConversations = getFilteredConversations();

  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1">
      <ResizablePanel defaultSize={25} minSize={20} maxSize={30}>
        <div className="h-full border-r bg-background">
          <div className="p-4 h-full">
            <h2 className="text-lg font-semibold mb-4">最近会话</h2>
            <div className="h-full flex flex-col gap-2">
              <ConversationHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />

              <ScrollArea className="flex-1">
                <div className="p-2">
                  {isLoading ? (
                    <ConversationLoadingState />
                  ) : filteredConversations.length > 0 ? (
                    filteredConversations.map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                      />
                    ))
                  ) : (
                    <ConversationEmptyState />
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={75}>
        <Outlet />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
