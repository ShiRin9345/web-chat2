import { create } from "zustand";

export type DialogType = "editProfile" | null;

interface DialogState {
  dialogType: DialogType;
  isOpen: boolean;
  openDialog: (type: DialogType) => void;
  closeDialog: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  dialogType: null,
  isOpen: false,
  openDialog: (type) => set({ dialogType: type, isOpen: true }),
  closeDialog: () => set({ dialogType: null, isOpen: false }),
}));
