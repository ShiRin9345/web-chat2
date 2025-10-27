import { useEffect, useCallback, useRef } from "react";
import { MessageItem } from "./MessageItem";
import { LoadMoreTrigger } from "./LoadMoreTrigger";
import { ScrollToBottomButton } from "./ScrollToBottomButton";
import { useScrollToBottom } from "@/hooks/useScrollToBottom";
import type { MessageWithSender } from "@/queries/messages";

// Skeleton 组件内联定义
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  const cn = (...classes: (string | undefined | null | boolean)[]) =>
    classes.filter(Boolean).join(" ");
  return (
    <div
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

interface MessageListProps {
  messages: MessageWithSender[];
  currentUserId: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  fetchNextPage: () => void;
  onRetryMessage?: (message: MessageWithSender) => void;
}

/**
 * 消息列表组件
 * 支持无限滚动、自动滚动到底部
 */
export function MessageList({
  messages,
  currentUserId,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  fetchNextPage,
  onRetryMessage,
}: MessageListProps) {
  const {
    containerRef,
    showScrollButton,
    isAtBottom,
    scrollToBottom,
    maintainScrollPosition,
    updateScrollHeight,
  } = useScrollToBottom();

  // 初次加载后滚动到底部
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      // 第一次加载完成，立即滚动到底部
      setTimeout(() => {
        scrollToBottom(false);
      }, 50);
    }
  }, [isLoading]);

  // 加载更多消息前后保持滚动位置
  const prevMessagesLengthRef = useRef(messages.length);
  
  useEffect(() => {
    // 如果是向上加载更多（消息数量增加了），保持滚动位置
    if (messages.length > prevMessagesLengthRef.current && isFetchingNextPage) {
      maintainScrollPosition();
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, isFetchingNextPage, maintainScrollPosition]);

  // 新消息到达时，如果在底部则自动滚动
  const prevMessageCountRef = useRef(0);
  
  useEffect(() => {
    // 如果消息数量增加且用户在底部，自动滚动
    if (messages.length > prevMessageCountRef.current && isAtBottom) {
      setTimeout(() => {
        scrollToBottom(true);
      }, 50);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, isAtBottom, scrollToBottom]);

  const handleLoadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      // 在加载前记录当前滚动高度
      updateScrollHeight();
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, updateScrollHeight]);

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full max-w-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 空状态
  if (!isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">暂无消息</p>
          <p className="text-sm">发送第一条消息开始聊天吧！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {/* 消息列表容器 */}
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-y-auto scroll-smooth"
      >
        {/* 加载更多触发器 */}
        <LoadMoreTrigger
          onLoadMore={handleLoadMore}
          hasMore={hasNextPage}
          isLoading={isFetchingNextPage}
        />

        {/* 消息列表 */}
        <div className="space-y-1">
          {messages.map((message, index) => {
            const isOwn = message.senderId === currentUserId;
            const prevMessage = messages[index - 1];
            const showAvatar =
              !prevMessage || prevMessage.senderId !== message.senderId;

            return (
              <MessageItem
                key={message.id}
                message={message}
                isOwn={isOwn}
                showAvatar={showAvatar}
                onRetry={onRetryMessage}
              />
            );
          })}
        </div>

        {/* 底部占位符 */}
        <div className="h-4" />
      </div>

      {/* 回到底部按钮 */}
      <ScrollToBottomButton
        show={showScrollButton}
        onClick={() => scrollToBottom(true)}
      />
    </div>
  );
}
