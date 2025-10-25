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
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);

  // 更新连接状态
  const updateConnectionState = useCallback(
    (state: ConnectionState) => {
      setConnectionState(state);
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
      return stream;
    } catch (err) {
      console.error("获取媒体设备失败:", err);
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
      console.log("收到远程媒体流");
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // 连接状态变化
    pc.onconnectionstatechange = () => {
      console.log("连接状态:", pc.connectionState);
      if (pc.connectionState === "connected") {
        updateConnectionState("connected");
        // 通知后端已连接
        if (socket && recordId) {
          socket.emit("call:connected", { recordId, userId });
        }
      } else if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected"
      ) {
        setError("连接失败，请检查网络");
        updateConnectionState("error");
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [roomId, friendId, socket, userId, recordId, updateConnectionState]);

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
        console.error("创建 Offer 失败:", err);
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
        console.error("创建 Answer 失败:", err);
        setError("创建连接失败");
        updateConnectionState("error");
      }
    },
    [socket, roomId, friendId, updateConnectionState]
  );

  // 切换音频
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  // 切换视频
  const toggleVideo = useCallback(() => {
    if (localStream && callType === "video") {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream, callType]);

  // 结束通话
  const endCall = useCallback(() => {
    // 停止所有媒体轨道
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
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
      });
    }

    updateConnectionState("ended");
    onCallEnded?.();
  }, [
    localStream,
    socket,
    roomId,
    userId,
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
      } else {
        // 接收方：发送接受信令
        updateConnectionState("connecting");
        socket.emit("call:accept", {
          roomId,
          userId,
          recordId,
        });
      }
    };

    init();

    // 清理函数
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
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

          // 处理队列中的 ICE candidates
          while (iceCandidatesQueueRef.current.length > 0) {
            const candidate = iceCandidatesQueueRef.current.shift();
            if (candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }

          await createAnswer(pc);
        } catch (err) {
          console.error("处理 Offer 失败:", err);
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

          // 处理队列中的 ICE candidates
          while (iceCandidatesQueueRef.current.length > 0) {
            const candidate = iceCandidatesQueueRef.current.shift();
            if (candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }
        } catch (err) {
          console.error("处理 Answer 失败:", err);
          setError("连接失败");
          updateConnectionState("error");
        }
      }
    };

    // 接收 ICE Candidate
    const handleReceiveIce = async (data: {
      candidate: RTCIceCandidateInit;
      fromUserId: string;
    }) => {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error("添加 ICE Candidate 失败:", err);
        }
      } else {
        // 如果还没有远程描述，先缓存 ICE candidate
        iceCandidatesQueueRef.current.push(data.candidate);
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
