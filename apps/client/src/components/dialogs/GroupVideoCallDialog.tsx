import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { useGroupWebRTC } from "@/hooks/useGroupWebRTC";
import { useCallStore } from "@/stores/call";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useSocket } from "@/providers/SocketProvider";

interface GroupVideoCallDialogProps {
  roomId: string;
  groupId: string;
  groupName: string;
  groupAvatar?: string;
  callType: "video" | "audio";
  isInitiator: boolean;
  recordId?: string;
}

export function GroupVideoCallDialog({
  roomId,
  groupId,
  groupName,
  groupAvatar,
  callType,
  isInitiator,
  recordId: initialRecordId,
}: GroupVideoCallDialogProps) {
  const { endGroupCall: closeCallDialog } = useCallStore();
  const session = authClient.useSession();
  const userId = session.data?.user.id || "";
  const socket = useSocket();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const [duration, setDuration] = useState(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    participantStates,
    participantInfo,
    toggleAudio,
    toggleVideo,
    leaveCall,
    error,
  } = useGroupWebRTC({
    roomId,
    groupId,
    userId,
    callType,
    isInitiator,
    recordId: initialRecordId,
    onCallEnded: () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      setTimeout(() => {
        closeCallDialog();
      }, 1000);
    },
  });

  // 发起群组通话或加入已有通话
  useEffect(() => {
    if (!socket) return;

    if (isInitiator) {
      // 发起群组通话请求
      socket.emit("group:call:request", {
        roomId,
        groupId,
        fromUserId: userId,
        callType,
      });
    } else {
      // 加入已进行的群组通话
      socket.emit("group:call:join", {
        roomId,
        groupId,
        userId,
      });
    }
  }, [socket, roomId, groupId, userId, callType, isInitiator]);

  // 监听通话记录创建（recordId 已通过 initialRecordId 传递给 useGroupWebRTC）

  // 设置本地视频流
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // 设置远程视频流
  useEffect(() => {
    remoteStreams.forEach((stream, participantId) => {
      const videoRef = remoteVideoRefs.current.get(participantId);
      if (videoRef && callType === "video") {
        videoRef.srcObject = stream;
      }

      // 设置远程音频流（语音通话）
      if (callType === "audio") {
        let audioRef = remoteAudioRefs.current.get(participantId);
        if (!audioRef) {
          audioRef = document.createElement("audio");
          audioRef.autoplay = true;
          document.body.appendChild(audioRef);
          remoteAudioRefs.current.set(participantId, audioRef);
        }
        audioRef.srcObject = stream;
      }
    });
  }, [remoteStreams, callType]);

  // 开始计时（只要有本地流就开始计时）
  useEffect(() => {
    if (localStream && !durationIntervalRef.current) {
      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [localStream]);

  const handleLeaveCall = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    leaveCall();
  };

  // 格式化通话时长
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // 计算网格列数
  const getGridColumns = (count: number) => {
    if (count <= 2) return count;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    return 4;
  };

  // 获取所有参与者（包括自己）
  const allParticipants = Array.from(remoteStreams.keys());
  const totalParticipants = allParticipants.length + 1; // +1 为自己
  const gridCols = getGridColumns(totalParticipants);

  return (
    <Dialog open onOpenChange={closeCallDialog}>
      <DialogContent className="max-w-6xl h-[700px] p-0 overflow-hidden">
        <DialogTitle className="sr-only">
          {callType === "video" ? "群组视频通话" : "群组语音通话"} - {groupName}
        </DialogTitle>

        <div className="relative w-full h-full bg-gray-900 flex flex-col">
          {/* 顶部信息栏 */}
          <div className="p-4 bg-gradient-to-b from-black/50 to-transparent z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={groupAvatar} alt={groupName} />
                  <AvatarFallback>{groupName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-medium">{groupName}</p>
                  <p className="text-white/80 text-sm">
                    {totalParticipants} 人正在通话 · {formatDuration(duration)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 视频网格区域 */}
          <div
            className="flex-1 overflow-auto p-4"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              gap: "1rem",
            }}
          >
            {/* 本地视频 */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
              {callType === "video" ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={session.data?.user.image || undefined} />
                    <AvatarFallback>
                      {session.data?.user.name?.[0] || "我"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                我 {!isAudioEnabled && "🔇"}{" "}
                {callType === "video" && !isVideoEnabled && "📹"}
              </div>
            </div>

            {/* 远程参与者视频 */}
            {allParticipants.map((participantId) => {
              const stream = remoteStreams.get(participantId);
              const state = participantStates.get(participantId) || "idle";
              const info = participantInfo.get(participantId);
              const name = info?.name || participantId;

              return (
                <div
                  key={participantId}
                  className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video"
                >
                  {callType === "video" && stream ? (
                    <video
                      ref={(el) => {
                        if (el) remoteVideoRefs.current.set(participantId, el);
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Avatar className="w-24 h-24">
                        <AvatarImage src={info?.avatar || undefined} />
                        <AvatarFallback>{name[0]}</AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                    {name}
                    {state !== "connected" && (
                      <span className="ml-1">
                        {state === "connecting" ? "连接中..." : "未连接"}
                      </span>
                    )}
                  </div>
                  {callType === "audio" && stream && (
                    <audio
                      ref={(el) => {
                        if (el) remoteAudioRefs.current.set(participantId, el);
                      }}
                      autoPlay
                      playsInline
                      className="hidden"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* 底部控制栏 */}
          <div className="p-6 bg-gradient-to-t from-black/50 to-transparent z-10">
            <div className="flex items-center justify-center space-x-4">
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

              <Button
                variant="destructive"
                size="icon"
                className="w-14 h-14 rounded-full"
                onClick={handleLeaveCall}
                title="离开通话（不会关闭整个群组通话）"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
              <div className="text-center">
                <p className="text-white text-lg mb-4">{error}</p>
                <Button variant="secondary" onClick={handleLeaveCall}>
                  关闭
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
