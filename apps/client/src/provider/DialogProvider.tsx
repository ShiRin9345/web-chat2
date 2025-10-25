import { useDialogStore } from "@/stores/dialog";
import { EditProfileDialog } from "../components/dialogs/EditProfileDialog";
import { AddFriendDialog } from "../components/dialogs/AddFriendDialog";
import { FriendRequestsDialog } from "../components/dialogs/FriendRequestsDialog";
import { CreateGroupDialog } from "../components/dialogs/CreateGroupDialog";

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
