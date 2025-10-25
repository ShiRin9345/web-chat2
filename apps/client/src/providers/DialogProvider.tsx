import { useDialogStore } from "@/stores/dialog";
import { EditProfileDialog } from "@/components/dialogs/EditProfileDialog";
import { AddFriendDialog } from "@/components/dialogs/AddFriendDialog";
import { FriendRequestsDialog } from "@/components/dialogs/FriendRequestsDialog";
import { CreateGroupDialog } from "@/components/dialogs/CreateGroupDialog";
import { VideoCallDialog } from "@/components/dialogs/VideoCallDialog";
import { IncomingCallDialog } from "@/components/dialogs/IncomingCallDialog";
import { useSocket } from "@/providers/SocketProvider";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

interface IncomingCallData {
  roomId: string;
  fromUserId: string;
  callType: "video" | "audio";
  recordId: string;
}

export function DialogProvider() {
  const { dialogType, isOpen, closeDialog, callData, openDialog } =
    useDialogStore();
  const socket = useSocket();
  const session = authClient.useSession();
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(
    null
  );

  // 获取来电用户信息
  const { data: incomingCallUser } = useQuery({
    queryKey: ["user", incomingCall?.fromUserId],
    queryFn: async () => {
      if (!incomingCall?.fromUserId) return null;
      const response = await fetch(
        `http://localhost:3001/api/friends/user/${incomingCall.fromUserId}`,
        {
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !!incomingCall?.fromUserId,
  });

  // 监听来电
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data: IncomingCallData) => {
      console.log("收到来电:", data);
      setIncomingCall(data);
    };

    // 监听通话被取消（发起方在接听前取消）
    const handleCallCancelled = () => {
      console.log("对方已取消通话");
      setIncomingCall(null);
    };

    // 监听通话结束（通用）
    const handleCallEnded = () => {
      console.log("通话已结束");
      setIncomingCall(null);
    };

    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:cancelled", handleCallCancelled);

    return () => {
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:cancelled", handleCallCancelled);
    };
  }, [socket]);

  // 接受来电
  const handleAcceptCall = () => {
    if (!incomingCall || !incomingCallUser) return;

    setIncomingCall(null);
    openDialog(incomingCall.callType === "video" ? "videoCall" : "audioCall", {
      roomId: incomingCall.roomId,
      friendId: incomingCall.fromUserId,
      friendName: incomingCallUser.name,
      friendAvatar: incomingCallUser.image,
      callType: incomingCall.callType,
      isInitiator: false,
      recordId: incomingCall.recordId,
    });
  };

  // 拒绝来电
  const handleRejectCall = () => {
    setIncomingCall(null);
  };

  return (
    <>
      {dialogType === "editProfile" && (
        <EditProfileDialog open={isOpen} onOpenChange={closeDialog} />
      )}
      {dialogType === "addFriend" && (
        <AddFriendDialog open={isOpen} onOpenChange={closeDialog} />
      )}
      {dialogType === "friendRequests" && (
        <FriendRequestsDialog open={isOpen} onOpenChange={closeDialog} />
      )}
      {dialogType === "createGroup" && (
        <CreateGroupDialog open={isOpen} onOpenChange={closeDialog} />
      )}
      {(dialogType === "videoCall" || dialogType === "audioCall") &&
        callData && (
          <VideoCallDialog
            roomId={callData.roomId}
            friendId={callData.friendId}
            friendName={callData.friendName}
            friendAvatar={callData.friendAvatar}
            callType={callData.callType}
            isInitiator={callData.isInitiator}
            recordId={callData.recordId}
          />
        )}
      {incomingCall && incomingCallUser && (
        <IncomingCallDialog
          isOpen={true}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          friendName={incomingCallUser.name}
          friendAvatar={incomingCallUser.image}
          callType={incomingCall.callType}
          roomId={incomingCall.roomId}
          recordId={incomingCall.recordId}
        />
      )}
    </>
  );
}
