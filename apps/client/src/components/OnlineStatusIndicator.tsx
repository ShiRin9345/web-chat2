import { useSocketContext } from "@/providers/SocketProvider";
import { Status, StatusIndicator } from "@workspace/ui/components/status";

interface OnlineStatusIndicatorProps {
  userId: string;
  className?: string;
  showLabel?: boolean;
}

export function OnlineStatusIndicator({
  userId,
  className,
  showLabel = false,
}: OnlineStatusIndicatorProps) {
  const { onlineUsers } = useSocketContext();
  const status = onlineUsers.has(userId) ? "online" : "offline";

  if (showLabel) {
    return (
      <Status status={status} className={className}>
        <StatusIndicator />
        <span className="capitalize">{status}</span>
      </Status>
    );
  }

  return (
    <div className={className}>
      <Status status={status}>
        <StatusIndicator />
      </Status>
    </div>
  );
}
