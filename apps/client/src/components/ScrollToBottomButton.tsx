import { Button } from "@workspace/ui/components/button";
import { ArrowDown } from "lucide-react";

interface ScrollToBottomButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

/**
 * 回到底部按钮组件
 */
export function ScrollToBottomButton({
  onClick,
  unreadCount = 0,
}: ScrollToBottomButtonProps) {
  return (
    <div className="absolute bottom-24 right-6 transition-all duration-200">
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
          <span className="absolute -top-1 -right-1 min-h-6 min-w-6 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow-lg border-2 border-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>
    </div>
  );
}
