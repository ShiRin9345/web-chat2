import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallStore } from "@/stores/call";
import { useSocket } from "@/providers/SocketProvider";
import { userQueryOptions } from "@/queries/users";

interface IncomingCallData {
  roomId: string;
  fromUserId: string;
  callType: "video" | "audio";
  recordId: string;
}

export function CallProvider() {
  const { setIncomingCallData } = useCallStore();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(
    null
  );

  // 监听来电
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = async (data: IncomingCallData) => {
      console.log("收到来电:", data);

      // 预加载用户信息
      try {
        await queryClient.prefetchQuery(userQueryOptions(data.fromUserId));
      } catch (error) {
        console.error("预加载用户信息失败:", error);
      }

      setIncomingCall(data);
    };

    // 监听通话被取消（发起方在接听前取消）
    const handleCallCancelled = () => {
      console.log("对方已取消通话");
      setIncomingCall(null);
      setIncomingCallData(null);
    };

    // 监听通话结束（通用）
    const handleCallEnded = () => {
      console.log("通话已结束");
      setIncomingCall(null);
      setIncomingCallData(null);
    };

    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:cancelled", handleCallCancelled);

    return () => {
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:cancelled", handleCallCancelled);
    };
  }, [socket, queryClient, setIncomingCallData]);

  // 当来电数据变化时，从缓存获取用户信息并更新 store
  useEffect(() => {
    if (incomingCall) {
      const incomingCallUser = queryClient.getQueryData(
        userQueryOptions(incomingCall.fromUserId).queryKey
      );

      if (incomingCallUser) {
        setIncomingCallData({
          roomId: incomingCall.roomId,
          friendId: incomingCall.fromUserId,
          friendName: incomingCallUser.name,
          friendAvatar: incomingCallUser.image || undefined,
          callType: incomingCall.callType,
          isInitiator: false,
          recordId: incomingCall.recordId,
        });
      }
    } else {
      setIncomingCallData(null);
    }
  }, [incomingCall, queryClient, setIncomingCallData]);

  return null;
}
