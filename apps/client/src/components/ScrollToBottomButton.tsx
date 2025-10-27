import { Button } from "@workspace/ui/components/button";
import { ArrowDown } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface ScrollToBottomButtonProps {
  show: boolean;
  onClick: () => void;
  unreadCount?: number;
}

/**
 * 回到底部按钮组件
 */
export function ScrollToBottomButton({
  show,
  onClick,
  unreadCount = 0,
}: ScrollToBottomButtonProps) {
  return (
    <div
      className={cn(
        "absolute bottom-24 right-6 transition-all duration-200",
        show
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <Button
        size="icon"
        variant="default"
        className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl relative"
        onClick={onClick}
        aria-label="滚动到底部"
      >
        <ArrowDown className="h-5 w-5" />

        {/* 未读消息计数 */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>
    </div>
  );
}
