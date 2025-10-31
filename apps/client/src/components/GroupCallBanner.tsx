import { useEffect, useState, useMemo } from "react";
import { Button } from "@workspace/ui/components/button";
import { Phone, Video, Users } from "lucide-react";
import { useSocket } from "@/providers/SocketProvider";
import { useCallStore } from "@/stores/call";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE } from "@/lib/api-config";
import type { Group } from "@workspace/database";

interface GroupCallBannerProps {
  groupId: string;
  chatId: string;
}

interface GroupCallStatus {
  isActive: boolean;
  participantsCount: number;
  callType: "video" | "audio" | null;
  roomId: string | null;
}

export function GroupCallBanner({ groupId }: GroupCallBannerProps) {
  const socket = useSocket();
  const { activeGroupCall, startGroupCall } = useCallStore();
  const queryClient = useQueryClient();

  // 从缓存中获取群组信息
  const groupInfo = useMemo(() => {
    const groupsData = queryClient.getQueryData<Group[]>(["groups"]);
    if (groupsData) {
      return groupsData.find((g) => g.id === groupId);
    }
    return null;
  }, [groupId, queryClient]);

  const [callStatus, setCallStatus] = useState<GroupCallStatus>({
    isActive: false,
    participantsCount: 0,
    callType: null,
    roomId: null,
  });

  // 查询群组通话状态
  const fetchCallStatus = async () => {
    try {
      const response = await axios.get<GroupCallStatus>(
        `${API_BASE}/groups/${groupId}/active-call`,
        {
          withCredentials: true,
        }
      );
      setCallStatus(response.data);
    } catch (error) {
      console.error("获取群组通话状态失败:", error);
      setCallStatus({
        isActive: false,
        participantsCount: 0,
        callType: null,
        roomId: null,
      });
    }
  };

  // 初始查询和定期查询
  useEffect(() => {
    if (!groupId) return;

    // 初始查询
    fetchCallStatus();

    // 每5秒查询一次
    const interval = setInterval(() => {
      fetchCallStatus();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [groupId]);

  // 监听 Socket 事件更新状态
  useEffect(() => {
    if (!socket) return;

    const handleCallStatus = (data: {
      groupId: string;
      participantsCount: number;
      callType: "video" | "audio";
      roomId: string;
      isActive: boolean;
    }) => {
      if (data.groupId === groupId) {
        setCallStatus({
          isActive: data.isActive,
          participantsCount: data.participantsCount,
          callType: data.callType,
          roomId: data.roomId,
        });
      }
    };

    const handleCallEnd = (data: { groupId: string }) => {
      if (data.groupId === groupId) {
        setCallStatus({
          isActive: false,
          participantsCount: 0,
          callType: null,
          roomId: null,
        });
      }
    };

    socket.on("group:call:status", handleCallStatus);
    socket.on("group:call:end", handleCallEnd);

    return () => {
      socket.off("group:call:status", handleCallStatus);
      socket.off("group:call:end", handleCallEnd);
    };
  }, [socket, groupId]);

  // 如果当前用户已在通话中，不显示横幅
  const isCurrentUserInCall =
    activeGroupCall?.groupId === groupId &&
    activeGroupCall?.roomId === callStatus.roomId;

  // 如果没有活跃通话或用户已在通话中，不显示横幅
  if (!callStatus.isActive || isCurrentUserInCall) {
    return null;
  }

  const handleJoinCall = () => {
    if (!callStatus.roomId || !callStatus.callType) return;

    // 加入群组通话
    startGroupCall({
      roomId: callStatus.roomId,
      groupId,
      groupName: groupInfo?.name || "群聊",
      groupAvatar: groupInfo?.avatar || undefined,
      callType: callStatus.callType,
      isInitiator: false,
    });
  };

  return (
    <div
      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 cursor-pointer transition-colors flex items-center justify-between"
      onClick={handleJoinCall}
    >
      <div className="flex items-center space-x-3">
        {callStatus.callType === "video" ? (
          <Video className="h-5 w-5" />
        ) : (
          <Phone className="h-5 w-5" />
        )}
        <span className="font-medium">
          {callStatus.participantsCount} 人正在
          {callStatus.callType === "video" ? "视频" : "语音"}
          通话中
        </span>
        <Users className="h-4 w-4 opacity-80" />
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-white hover:bg-green-700 hover:text-white"
        onClick={(e) => {
          e.stopPropagation();
          handleJoinCall();
        }}
      >
        点击加入
      </Button>
    </div>
  );
}
