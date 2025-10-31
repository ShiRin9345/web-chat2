import { Loader2Icon } from "lucide-react";
import { useEffect, useRef } from "react";

interface LoadMoreTriggerProps {
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

export function LoadMoreTrigger({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: LoadMoreTriggerProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore();
        }
      },
      {
        threshold: 0.1,
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  if (!hasNextPage && !isFetchingNextPage) {
    return (
      <div className="flex justify-center py-4">
        <span className="text-xs text-muted-foreground">已加载全部消息</span>
      </div>
    );
  }

  return (
    <div ref={observerTarget} className="flex justify-center py-4">
      {isFetchingNextPage && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="w-4 h-4 animate-spin" />
          <span>加载中...</span>
        </div>
      )}
    </div>
  );
}
