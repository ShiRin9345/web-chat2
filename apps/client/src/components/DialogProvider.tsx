import { useDialogStore } from "@/stores/dialog";
import { EditProfileDialog } from "./EditProfileDialog";
import { AddFriendDialog } from "./AddFriendDialog";
import { FriendRequestsDialog } from "./FriendRequestsDialog";
import { CreateGroupDialog } from "./CreateGroupDialog";

export function DialogProvider() {
  const { dialogType, isOpen, closeDialog } = useDialogStore();

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
    </>
  );
}
