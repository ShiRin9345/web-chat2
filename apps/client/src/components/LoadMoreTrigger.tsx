import { useEffect, useRef } from "react";

interface LoadMoreTriggerProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

/**
 * 加载更多触发器组件
 * 使用 IntersectionObserver 检测滚动到顶部
 */
export function LoadMoreTrigger({
  onLoadMore,
  hasMore,
  isLoading,
}: LoadMoreTriggerProps) {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: "100px", // 距离触发器100px时就开始加载
        threshold: 0,
      }
    );

    observer.observe(trigger);

    return () => {
      observer.disconnect();
    };
  }, [onLoadMore, hasMore, isLoading]);

  if (!hasMore) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        没有更多消息了
      </div>
    );
  }

  return (
    <div ref={triggerRef} className="py-4 text-center">
      {isLoading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">加载中...</span>
        </div>
      ) : (
        <div className="h-1" /> // 占位符
      )}
    </div>
  );
}
