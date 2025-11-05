import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "@/providers/SocketProvider";

export type ConnectionState =
  | "idle"
  | "calling"
  | "ringing"
  | "connecting"
  | "connected"
  | "ended"
  | "error";

interface UseWebRTCProps {
  roomId: string;
  userId: string;
  friendId: string;
  callType: "video" | "audio";
  isInitiator: boolean;
  recordId?: string;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onCallEnded?: () => void;
}

// STUN 服务器配置
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: [
        "turn:8.152.201.45:3478?transport=udp",
        "turn:8.152.201.45:3478?transport=tcp",
      ],
      username: "admin", // TURN 用户名
      credential: "123456", // TURN 密码
    },
  ],
};

export function useWebRTC({
  roomId,
  userId,
  friendId,
  callType,
  isInitiator,
  recordId: initialRecordId,
  onConnectionStateChange,
  onCallEnded,
}: UseWebRTCProps) {
  const socket = useSocket();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === "video");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | undefined>(initialRecordId);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const isConnectedRef = useRef(false); // 跟踪是否已连接
  const localStreamRef = useRef<MediaStream | null>(null); // 保存最新的 localStream 引用

  // 更新连接状态
  const updateConnectionState = useCallback(
    (state: ConnectionState) => {
      setConnectionState(state);
      // 同步更新 ref
      if (state === "connected") {
        isConnectedRef.current = true;
      } else if (state === "ended" || state === "error") {
        isConnectedRef.current = false;
      }
      onConnectionStateChange?.(state);
    },
    [onConnectionStateChange]
  );

  // 初始化本地媒体流
  const initLocalStream = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === "video",
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      localStreamRef.current = stream; // 同步更新 ref
      return stream;
    } catch (err) {
      setError("无法访问摄像头或麦克风，请检查设备权限");
      updateConnectionState("error");
      return null;
    }
  }, [callType, updateConnectionState]);

  // 创建 PeerConnection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // 处理 ICE 候选
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("webrtc:ice-candidate", {
          roomId,
          candidate: event.candidate.toJSON(),
          targetUserId: friendId,
        });
      }
    };

    // 接收远程流
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // 连接状态变化
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        updateConnectionState("connected");
        // 通知后端已连接
        if (socket && recordId) {
          socket.emit("call:connected", { recordId, userId });
        }
      } else if (pc.connectionState === "failed") {
        setError("连接失败，请检查网络");
        updateConnectionState("error");
        // 通知对方连接失败
        if (socket && recordId) {
          socket.emit("call:end", {
            roomId,
            userId,
            recordId,
            endReason: "cancelled",
            targetUserId: friendId, // 添加目标用户ID
          });
        }
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "closed"
      ) {
        // 如果是在通话中突然断开（不是正常挂断）
        if (isConnectedRef.current) {
          setError("对方网络丢失，通话已断开");
          updateConnectionState("ended");
          // 通知对方连接已断开
          if (socket && recordId) {
            socket.emit("call:end", {
              roomId,
              userId,
              recordId,
              endReason: "cancelled",
              targetUserId: friendId, // 添加目标用户ID
            });
          }
          // 2秒后自动关闭对话框
          setTimeout(() => {
            onCallEnded?.();
          }, 2000);
        }
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [
    roomId,
    friendId,
    socket,
    userId,
    recordId,
    updateConnectionState,
    onCallEnded,
  ]);

  // 创建 Offer (发起方)
  const createOffer = useCallback(
    async (pc: RTCPeerConnection) => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (socket) {
          socket.emit("webrtc:offer", {
            roomId,
            offer: offer,
            targetUserId: friendId,
          });
        }
      } catch (err) {
        setError("创建连接失败");
        updateConnectionState("error");
      }
    },
    [socket, roomId, friendId, updateConnectionState]
  );

  // 创建 Answer (接收方)
  const createAnswer = useCallback(
    async (pc: RTCPeerConnection) => {
      try {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (socket) {
          socket.emit("webrtc:answer", {
            roomId,
            answer: answer,
            targetUserId: friendId,
          });
        }
      } catch (err) {
        setError("创建连接失败");
        updateConnectionState("error");
      }
    },
    [socket, roomId, friendId, updateConnectionState]
  );

  // 切换音频
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  // 切换视频
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current && callType === "video") {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [callType]);

  // 结束通话
  const endCall = useCallback(() => {
    // 使用 ref 获取最新的 localStream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null; // 清空引用
    }

    // 关闭 PeerConnection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // 发送结束信令
    if (socket && recordId) {
      socket.emit("call:end", {
        roomId,
        userId,
        recordId,
        endReason: "hangup",
        targetUserId: friendId,
      });
    }

    updateConnectionState("ended");
    onCallEnded?.();
  }, [
    socket,
    roomId,
    userId,
    friendId,
    recordId,
    updateConnectionState,
    onCallEnded,
  ]);

  // 初始化通话
  useEffect(() => {
    if (!socket) return;

    const init = async () => {
      // 获取本地媒体流
      const stream = await initLocalStream();
      if (!stream) return;

      // 创建 PeerConnection
      const pc = createPeerConnection();

      // 添加本地流到 PeerConnection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      if (isInitiator) {
        // 发起方：发送通话请求
        updateConnectionState("calling");
        socket.emit("call:request", {
          roomId,
          fromUserId: userId,
          toUserId: friendId,
          callType,
        });
        // 注意：发起方需要等待接收方接受后才创建 Offer
      } else {
        // 接收方：发送接受信令
        updateConnectionState("connecting");
        socket.emit("call:accept", {
          roomId,
          userId,
          recordId,
        });
        // 注意：接收方需要等待发起方发送 Offer
      }
    };

    init();

    // 监听浏览器标签页关闭/刷新事件
    const handleBeforeUnload = () => {
      // 立即通知对方通话结束
      if (socket && recordId) {
        socket.emit("call:end", {
          roomId,
          userId,
          recordId,
          endReason: "cancelled",
          targetUserId: friendId,
        });
      }
      // 停止所有媒体轨道
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      // 关闭 PeerConnection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // 清理函数
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // 使用 ref 清理最新的 localStream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        localStreamRef.current = null;
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  // Socket 事件监听
  useEffect(() => {
    if (!socket) return;

    // 接收通话记录 ID
    const handleRecordCreated = (data: { recordId: string }) => {
      setRecordId(data.recordId);
    };

    // 通话被接受
    const handleCallAccepted = async () => {
      updateConnectionState("connecting");
      const pc = peerConnectionRef.current;
      if (pc) {
        await createOffer(pc);
      }
    };

    // 接收 Offer
    const handleReceiveOffer = async (data: {
      offer: RTCSessionDescriptionInit;
      fromUserId: string;
    }) => {
      const pc = peerConnectionRef.current;
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          // 创建 Answer
          await createAnswer(pc);
        } catch (err) {
          setError("连接失败");
          updateConnectionState("error");
        }
      }
    };

    // 接收 Answer
    const handleReceiveAnswer = async (data: {
      answer: RTCSessionDescriptionInit;
      fromUserId: string;
    }) => {
      const pc = peerConnectionRef.current;
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (err) {
          setError("连接失败");
          updateConnectionState("error");
        }
      }
    };

    // 接收 ICE Candidate
    // 使用 WebRTC 内置的 Trickle ICE 机制，不需要手动维护队列
    // addIceCandidate() 可以在设置远程描述之前调用，浏览器会自动处理
    const handleReceiveIce = async (data: {
      candidate: RTCIceCandidateInit;
      fromUserId: string;
    }) => {
      const pc = peerConnectionRef.current;
      if (!pc) {
        return;
      }

      try {
        // 直接添加，WebRTC 会自动处理早到的 candidates
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        // 可能的错误情况：
        // - PeerConnection 已关闭
        // - candidate 格式无效
        // - 重复的 candidate（通常被忽略，不会抛出错误）
      }
    };

    // 通话被拒绝
    const handleCallRejected = () => {
      setError("对方已拒绝通话");
      updateConnectionState("ended");
      onCallEnded?.();
    };

    // 通话结束
    const handleCallEnded = () => {
      updateConnectionState("ended");
      onCallEnded?.();
    };

    // 通话错误
    const handleCallError = (data: { message: string }) => {
      setError(data.message);
      updateConnectionState("error");
    };

    socket.on("call:record-created", handleRecordCreated);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("webrtc:receive-offer", handleReceiveOffer);
    socket.on("webrtc:receive-answer", handleReceiveAnswer);
    socket.on("webrtc:receive-ice", handleReceiveIce);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:ended", handleCallEnded);
    socket.on("call:error", handleCallError);

    return () => {
      socket.off("call:record-created", handleRecordCreated);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("webrtc:receive-offer", handleReceiveOffer);
      socket.off("webrtc:receive-answer", handleReceiveAnswer);
      socket.off("webrtc:receive-ice", handleReceiveIce);
      socket.off("call:rejected", handleCallRejected);
      socket.off("call:ended", handleCallEnded);
      socket.off("call:error", handleCallError);
    };
  }, [socket, createOffer, createAnswer, updateConnectionState, onCallEnded]);

  return {
    localStream,
    remoteStream,
    isAudioEnabled,
    isVideoEnabled,
    connectionState,
    toggleAudio,
    toggleVideo,
    endCall,
    error,
  };
}
