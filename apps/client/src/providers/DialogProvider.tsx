import { lazy, Suspense } from "react";
import { useDialogStore } from "@/stores/dialog";
import { useCallStore } from "@/stores/call";
import { LoadingDialog } from "@/components/dialogs/LoadingDialog";

// 懒加载所有 Dialog 组件
const EditProfileDialog = lazy(() =>
  import("@/components/dialogs/EditProfileDialog").then((module) => ({
    default: module.EditProfileDialog,
  }))
);

const AddFriendDialog = lazy(() =>
  import("@/components/dialogs/AddFriendDialog").then((module) => ({
    default: module.AddFriendDialog,
  }))
);

const FriendRequestsDialog = lazy(() =>
  import("@/components/dialogs/FriendRequestsDialog").then((module) => ({
    default: module.FriendRequestsDialog,
  }))
);

const CreateGroupDialog = lazy(() =>
  import("@/components/dialogs/CreateGroupDialog").then((module) => ({
    default: module.CreateGroupDialog,
  }))
);

const IncomingCallDialog = lazy(() =>
  import("@/components/dialogs/IncomingCallDialog").then((module) => ({
    default: module.IncomingCallDialog,
  }))
);

const VideoCallDialog = lazy(() =>
  import("@/components/dialogs/VideoCallDialog").then((module) => ({
    default: module.VideoCallDialog,
  }))
);

const GroupVideoCallDialog = lazy(() =>
  import("@/components/dialogs/GroupVideoCallDialog").then((module) => ({
    default: module.GroupVideoCallDialog,
  }))
);

export function DialogProvider() {
  const { dialogType, isOpen, closeDialog } = useDialogStore();
  const {
    incomingCallData,
    activeCallData,
    activeGroupCall,
    acceptIncomingCall,
    rejectIncomingCall,
  } = useCallStore();

  // 根据不同的 Dialog 类型提供不同的加载消息
  const getLoadingMessage = () => {
    switch (dialogType) {
      case "editProfile":
        return "加载编辑资料...";
      case "addFriend":
        return "加载添加好友...";
      case "friendRequests":
        return "加载好友申请...";
      case "createGroup":
        return "加载创建群组...";
      case "incomingCall":
        return "加载通话界面...";
      case "activeCall":
        return "加载通话界面...";
      case "activeGroupCall":
        return "加载群组通话界面...";
      default:
        return "加载中...";
    }
  };

  return (
    <Suspense
      fallback={<LoadingDialog open={isOpen} message={getLoadingMessage()} />}
    >
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
      {dialogType === "incomingCall" && incomingCallData && (
        <IncomingCallDialog
          isOpen={isOpen}
          onAccept={acceptIncomingCall}
          onReject={rejectIncomingCall}
          friendName={incomingCallData.friendName}
          friendAvatar={incomingCallData.friendAvatar}
          callType={incomingCallData.callType}
          roomId={incomingCallData.roomId}
          recordId={incomingCallData.recordId || ""}
        />
      )}
      {dialogType === "activeCall" && activeCallData && (
        <VideoCallDialog
          roomId={activeCallData.roomId}
          friendId={activeCallData.friendId}
          friendName={activeCallData.friendName}
          friendAvatar={activeCallData.friendAvatar}
          callType={activeCallData.callType}
          isInitiator={activeCallData.isInitiator}
          recordId={activeCallData.recordId}
        />
      )}
      {dialogType === "activeGroupCall" && activeGroupCall && (
        <GroupVideoCallDialog
          roomId={activeGroupCall.roomId}
          groupId={activeGroupCall.groupId}
          groupName={activeGroupCall.groupName}
          groupAvatar={activeGroupCall.groupAvatar}
          callType={activeGroupCall.callType}
          isInitiator={activeGroupCall.isInitiator}
          recordId={activeGroupCall.recordId}
        />
      )}
    </Suspense>
  );
}
