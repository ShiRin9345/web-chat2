import { create } from "zustand";
import { useDialogStore } from "./dialog";

export interface CallData {
  roomId: string;
  friendId: string;
  friendName: string;
  friendAvatar?: string;
  callType: "video" | "audio";
  isInitiator: boolean;
  recordId?: string;
}

export interface GroupCallData {
  roomId: string;
  groupId: string;
  groupName: string;
  groupAvatar?: string;
  callType: "video" | "audio";
  isInitiator: boolean;
  recordId?: string;
}

interface IncomingCallState {
  incomingCallData: CallData | null;
  setIncomingCallData: (data: CallData | null) => void;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
}

interface ActiveCallState {
  activeCallData: CallData | null;
  startCall: (data: CallData) => void;
  endCall: () => void;
}

interface GroupCallState {
  activeGroupCall: GroupCallData | null;
  startGroupCall: (data: GroupCallData) => void;
  endGroupCall: () => void;
}

type CallState = IncomingCallState & ActiveCallState & GroupCallState;

export const useCallStore = create<CallState>((set, get) => ({
  // 来电数据
  incomingCallData: null,
  setIncomingCallData: (data) => {
    set({ incomingCallData: data });
    if (data) {
      // 打开来电对话框
      useDialogStore.getState().openDialog("incomingCall");
    } else {
      // 关闭来电对话框
      const currentDialog = useDialogStore.getState().dialogType;
      if (currentDialog === "incomingCall") {
        useDialogStore.getState().closeDialog();
      }
    }
  },
  acceptIncomingCall: () => {
    const data = get().incomingCallData;
    if (data) {
      set({ incomingCallData: null, activeCallData: data });
      useDialogStore.getState().openDialog("activeCall");
    }
  },
  rejectIncomingCall: () => {
    set({ incomingCallData: null });
    useDialogStore.getState().closeDialog();
  },

  // 通话中数据
  activeCallData: null,
  startCall: (data) => {
    set({ activeCallData: data });
    useDialogStore.getState().openDialog("activeCall");
  },
  endCall: () => {
    set({ activeCallData: null });
    useDialogStore.getState().closeDialog();
  },

  // 群组通话数据
  activeGroupCall: null,
  startGroupCall: (data) => {
    set({ activeGroupCall: data });
    useDialogStore.getState().openDialog("activeGroupCall");
  },
  endGroupCall: () => {
    set({ activeGroupCall: null });
    useDialogStore.getState().closeDialog();
  },
}));
