import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { useWebRTC, type ConnectionState } from "@/hooks/useWebRTC";
import { useDialogStore } from "@/stores/dialog";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface VideoCallDialogProps {
  roomId: string;
  friendId: string;
  friendName: string;
  friendAvatar?: string;
  callType: "video" | "audio";
  isInitiator: boolean;
  recordId?: string;
}

export function VideoCallDialog({
  roomId,
  friendId,
  friendName,
  friendAvatar,
  callType,
  isInitiator,
  recordId: initialRecordId,
}: VideoCallDialogProps) {
  const { isOpen, closeDialog } = useDialogStore();
  const session = authClient.useSession();
  const userId = session.data?.user.id || "";

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [duration, setDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionState>("idle");
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    localStream,
    remoteStream,
    isAudioEnabled,
    isVideoEnabled,
    connectionState,
    toggleAudio,
    toggleVideo,
    endCall,
    error,
  } = useWebRTC({
    roomId,
    userId,
    friendId,
    callType,
    isInitiator,
    recordId: initialRecordId,
    onConnectionStateChange: (state) => {
      setConnectionStatus(state);
      // 当连接建立时开始计时
      if (state === "connected" && !durationIntervalRef.current) {
        durationIntervalRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      }
    },
    onCallEnded: () => {
      // 清理计时器
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      // 延迟关闭对话框
      setTimeout(() => {
        closeDialog();
      }, 1000);
    },
  });

  // 设置本地视频流
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // 设置远程视频流
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // 清理计时器
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  const handleEndCall = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    endCall();
  };

  // 格式化通话时长
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // 获取状态文本
  const getStatusText = () => {
    switch (connectionStatus) {
      case "calling":
        return "呼叫中...";
      case "ringing":
        return "等待接听...";
      case "connecting":
        return "连接中...";
      case "connected":
        return formatDuration(duration);
      case "ended":
        return "通话已结束";
      case "error":
        return error || "连接失败";
      default:
        return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeDialog}>
      <DialogContent className="max-w-4xl h-[600px] p-0 overflow-hidden">
        {/* 隐藏的标题，用于屏幕阅读器 */}
        <DialogTitle className="sr-only">
          {callType === "video" ? "视频通话" : "语音通话"} - {friendName}
        </DialogTitle>
        
        <div className="relative w-full h-full bg-gray-900">
          {/* 远程视频（主画面） */}
          {callType === "video" ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Avatar className="w-32 h-32">
                <AvatarImage src={friendAvatar} alt={friendName} />
                <AvatarFallback>{friendName[0]}</AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* 本地视频（小窗口） */}
          {callType === "video" && (
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
            </div>
          )}

          {/* 顶部信息栏 */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={friendAvatar} alt={friendName} />
                  <AvatarFallback>{friendName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-medium">{friendName}</p>
                  <p className="text-white/80 text-sm">{getStatusText()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 底部控制栏 */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent">
            <div className="flex items-center justify-center space-x-4">
              {/* 静音按钮 */}
              <Button
                variant={isAudioEnabled ? "secondary" : "destructive"}
                size="icon"
                className="w-12 h-12 rounded-full"
                onClick={toggleAudio}
              >
                {isAudioEnabled ? (
                  <Mic className="w-5 h-5" />
                ) : (
                  <MicOff className="w-5 h-5" />
                )}
              </Button>

              {/* 视频切换按钮 */}
              {callType === "video" && (
                <Button
                  variant={isVideoEnabled ? "secondary" : "destructive"}
                  size="icon"
                  className="w-12 h-12 rounded-full"
                  onClick={toggleVideo}
                >
                  {isVideoEnabled ? (
                    <Video className="w-5 h-5" />
                  ) : (
                    <VideoOff className="w-5 h-5" />
                  )}
                </Button>
              )}

              {/* 挂断按钮 */}
              <Button
                variant="destructive"
                size="icon"
                className="w-14 h-14 rounded-full"
                onClick={handleEndCall}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (connectionStatus === "error" || connectionStatus === "ended") && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center">
                <p className="text-white text-lg mb-4">{error}</p>
                <Button variant="secondary" onClick={handleEndCall}>
                  关闭
                </Button>
              </div>
            </div>
          )}
        </div>

        <style>
          {`
            .mirror {
              transform: scaleX(-1);
            }
          `}
        </style>
      </DialogContent>
    </Dialog>
  );
}
