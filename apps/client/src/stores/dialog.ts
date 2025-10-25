import { create } from "zustand";

export type DialogType =
  | "editProfile"
  | "addFriend"
  | "friendRequests"
  | "createGroup"
  | "videoCall"
  | "audioCall"
  | null;

export interface CallDialogData {
  roomId: string;
  friendId: string;
  friendName: string;
  friendAvatar?: string;
  callType: "video" | "audio";
  isInitiator: boolean;
  recordId?: string;
}

interface DialogState {
  dialogType: DialogType;
  isOpen: boolean;
  callData: CallDialogData | null;
  openDialog: (type: DialogType, callData?: CallDialogData) => void;
  closeDialog: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  dialogType: null,
  isOpen: false,
  callData: null,
  openDialog: (type, callData) =>
    set({ dialogType: type, isOpen: true, callData: callData || null }),
  closeDialog: () => set({ dialogType: null, isOpen: false, callData: null }),
}));
