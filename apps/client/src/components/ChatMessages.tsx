import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/providers/SocketProvider";
import {
  useMessages,
  transformMessagesToRenderArray,
  isMessageInCache,
  type MessageWithSender,
  type MessagesPageResponse,
} from "@/queries/messages";
import { MessageList } from "./MessageList";
import { LoadMoreTrigger } from "./LoadMoreTrigger";
import { ScrollToBottomButton } from "./ScrollToBottomButton";

interface ChatMessagesProps {
  chatId: string;
  currentUserId: string;
  onMessageSend?: (content: string) => void;
}

export function ChatMessages({ chatId, currentUserId }: ChatMessagesProps) {
  const queryClient = useQueryClient();
  const socket = useSocket();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useMessages(chatId);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousScrollHeightRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  // 将分页消息转换为渲染数组
  const messages = transformMessagesToRenderArray(data?.pages);

  // 检查是否在底部
  const isAtBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return false;

    const threshold = 100;
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollTop + clientHeight >= scrollHeight - threshold;
  }, []);

  // 滚动到底部
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    const atBottom = isAtBottom();
    setShowScrollButton(!atBottom);

    if (atBottom) {
      setUnreadCount(0);
    }
  }, [isAtBottom]);

  // 初次加载后滚动到底部
  useEffect(() => {
    if (!isLoading && messages.length > 0 && isInitialLoadRef.current) {
      scrollToBottom("auto");
      isInitialLoadRef.current = false;
    }
  }, [isLoading, messages.length, scrollToBottom]);

  // 监听 WebSocket 新消息
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: MessageWithSender) => {
      // 验证消息是否属于当前聊天
      const isFriendChat = chatId.startsWith("friend-");
      const isGroupChat = chatId.startsWith("group-");

      let belongsToCurrentChat = false;

      if (isFriendChat) {
        const friendId = chatId.replace("friend-", "");
        belongsToCurrentChat =
          (message.senderId === friendId &&
            message.recipientId === currentUserId) ||
          (message.senderId === currentUserId &&
            message.recipientId === friendId);
      } else if (isGroupChat) {
        const groupId = chatId.replace("group-", "");
        belongsToCurrentChat = message.groupId === groupId;
      }

      if (!belongsToCurrentChat) return;

      const queryKey = ["messages", chatId];

      // 更新缓存
      queryClient.setQueryData<{
        pages: MessagesPageResponse[];
        pageParams: unknown[];
      }>(queryKey, (oldData) => {
        if (!oldData) {
          return {
            pages: [
              {
                messages: [message],
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
          // 如果消息包含 tempId，说明这是乐观更新的消息确认，需要替换临时消息
          if (message.tempId) {
            const tempIndex = firstPage.messages.findIndex(
              (m) => m.tempId === message.tempId
            );

            if (tempIndex !== -1) {
              // 找到了临时消息，替换它
              const updatedMessages = [...firstPage.messages];
              updatedMessages[tempIndex] = message;

              newPages[0] = {
                ...firstPage,
                messages: updatedMessages,
              };

              return {
                ...oldData,
                pages: newPages,
              };
            }
          }

          // 检查真实消息是否已存在（防止重复）
          if (isMessageInCache(oldData.pages, message.id)) {
            return oldData;
          }

          // 添加新消息（别人发送的消息）
          newPages[0] = {
            messages: [message, ...firstPage.messages],
            nextCursor: firstPage.nextCursor ?? null,
            hasMore: firstPage.hasMore ?? false,
          };
        }

        return {
          ...oldData,
          pages: newPages,
        };
      });

      // 滚动策略
      const wasAtBottom = isAtBottom();
      const isSentByCurrentUser = message.senderId === currentUserId;

      if (isSentByCurrentUser || wasAtBottom) {
        // 等待 DOM 更新后滚动
        setTimeout(() => scrollToBottom("smooth"), 100);
      } else {
        // 增加未读计数
        setUnreadCount((prev) => prev + 1);
      }
    };

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [socket, chatId, currentUserId, queryClient, isAtBottom, scrollToBottom]);

  // 加载历史消息时保持滚动位置
  useEffect(() => {
    if (isFetchingNextPage && scrollContainerRef.current) {
      previousScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
    }
  }, [isFetchingNextPage]);

  // 加载完成后恢复滚动位置
  useEffect(() => {
    if (
      !isFetchingNextPage &&
      previousScrollHeightRef.current > 0 &&
      scrollContainerRef.current
    ) {
      const container = scrollContainerRef.current;
      const newScrollHeight = container.scrollHeight;
      const heightDiff = newScrollHeight - previousScrollHeightRef.current;

      container.scrollTop = container.scrollTop + heightDiff;
      previousScrollHeightRef.current = 0;
    }
  }, [isFetchingNextPage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full overflow-y-auto">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        <LoadMoreTrigger
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
        />

        <MessageList messages={messages} currentUserId={currentUserId} />

        <div ref={bottomRef} />
      </div>

      {showScrollButton && (
        <ScrollToBottomButton
          onClick={() => scrollToBottom("smooth")}
          unreadCount={unreadCount}
        />
      )}
    </div>
  );
}
