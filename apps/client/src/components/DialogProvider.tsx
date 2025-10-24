import { useDialogStore } from "@/stores/dialog";
import { EditProfileDialog } from "./EditProfileDialog";

export function DialogProvider() {
  const { dialogType, isOpen, closeDialog } = useDialogStore();

  return (
    <>
      {dialogType === "editProfile" && (
        <EditProfileDialog open={isOpen} onOpenChange={closeDialog} />
      )}
    </>
  );
}
