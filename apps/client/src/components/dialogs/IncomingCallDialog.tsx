import { Dialog, DialogContent } from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Phone, PhoneOff } from "lucide-react";
import { useSocket } from "@/providers/SocketProvider";
import { authClient } from "@/lib/auth-client";

interface IncomingCallDialogProps {
  isOpen: boolean;
  onAccept: () => void;
  onReject: () => void;
  friendName: string;
  friendAvatar?: string;
  callType: "video" | "audio";
  roomId: string;
  recordId: string;
}

export function IncomingCallDialog({
  isOpen,
  onAccept,
  onReject,
  friendName,
  friendAvatar,
  callType,
  roomId,
  recordId,
}: IncomingCallDialogProps) {
  const socket = useSocket();
  const session = authClient.useSession();
  const userId = session.data?.user.id || "";

  const handleReject = () => {
    if (socket) {
      socket.emit("call:reject", {
        roomId,
        userId,
        recordId,
      });
    }
    onReject();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleReject}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center justify-center py-8">
          {/* 头像 */}
          <Avatar className="w-24 h-24 mb-4">
            <AvatarImage src={friendAvatar} alt={friendName} />
            <AvatarFallback>{friendName[0]}</AvatarFallback>
          </Avatar>

          {/* 名称 */}
          <h2 className="text-2xl font-semibold mb-2">{friendName}</h2>

          {/* 提示文本 */}
          <p className="text-muted-foreground mb-8">
            {callType === "video" ? "视频通话呼叫中..." : "语音通话呼叫中..."}
          </p>

          {/* 按钮 */}
          <div className="flex space-x-8">
            <div className="flex flex-col items-center">
              <Button
                variant="destructive"
                size="icon"
                className="w-16 h-16 rounded-full mb-2"
                onClick={handleReject}
              >
                <PhoneOff className="w-8 h-8" />
              </Button>
              <span className="text-sm text-muted-foreground">拒绝</span>
            </div>

            <div className="flex flex-col items-center">
              <Button
                variant="default"
                size="icon"
                className="w-16 h-16 rounded-full mb-2 bg-green-600 hover:bg-green-700"
                onClick={onAccept}
              >
                <Phone className="w-8 h-8" />
              </Button>
              <span className="text-sm text-muted-foreground">接听</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
