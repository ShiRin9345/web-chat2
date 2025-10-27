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
  const previousMessageCountRef = useRef(0);

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

  // 滚动到底部（等待图片加载）
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    // 使用 requestAnimationFrame 确保在下一帧执行
    requestAnimationFrame(() => {
      // 再次延迟，确保图片等资源加载完成
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior });
        // 滚动到底部时清空未读数
        setUnreadCount(0);
      }, 100);
    });
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
      // 直接设置 scrollTop 到最大值
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
      isInitialLoadRef.current = false;
      previousMessageCountRef.current = messages.length;
    }
  }, [isLoading, messages.length]);

  // 监听消息数量变化（用于发送消息后立即滚动）
  useEffect(() => {
    // 跳过初次加载和加载更多时
    if (isInitialLoadRef.current || isFetchingNextPage) return;

    // 如果消息数量增加，检查是否需要滚动
    if (messages.length > previousMessageCountRef.current) {
      // 获取最新的消息
      const latestMessage = messages[0];

      // 如果是自己发送的消息（包括临时消息），强制滚动到底部
      if (latestMessage && latestMessage.senderId === currentUserId) {
        setTimeout(() => scrollToBottom("smooth"), 50);
      } else {
        // 别人发送的消息，只在底部时滚动
        const wasAtBottom = isAtBottom();
        if (wasAtBottom) {
          setTimeout(() => scrollToBottom("smooth"), 50);
        }
      }
    }

    previousMessageCountRef.current = messages.length;
  }, [
    messages.length,
    messages,
    currentUserId,
    isFetchingNextPage,
    isAtBottom,
    scrollToBottom,
  ]);

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

      // 判断是否是自己发送的消息（乐观更新的确认）
      const isOwnMessage = message.senderId === currentUserId;
      const isOptimisticUpdate = message.tempId && isOwnMessage;

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

      // 处理滚动和未读计数
      // 如果是乐观更新的确认消息，不处理滚动（已经处理过了）
      if (!isOptimisticUpdate) {
        // 如果是自己发送的消息，无论是否在底部都滚动到底部
        if (isOwnMessage) {
          // 对于图片消息，需要更长的延迟等待加载
          const delay = message.type === "image" ? 150 : 50;
          setTimeout(() => scrollToBottom("smooth"), delay);
        } else {
          // 别人发送的消息
          const wasAtBottom = isAtBottom();
          if (wasAtBottom) {
            // 在底部，自动滚动
            const delay = message.type === "image" ? 150 : 50;
            setTimeout(() => scrollToBottom("smooth"), delay);
          } else {
            // 不在底部，增加未读数
            setUnreadCount((prev) => prev + 1);
          }
        }
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
