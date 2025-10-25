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
  const isConnectedRef = useRef(false); // 跟踪是否已连接

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
        console.log("发送 ICE Candidate 给好友:", friendId);
        socket.emit("webrtc:ice-candidate", {
          roomId,
          candidate: event.candidate.toJSON(),
          targetUserId: friendId,
        });
      } else if (!event.candidate) {
        console.log("所有 ICE Candidate 已收集完成");
      }
    };

    // 接收远程流
    pc.ontrack = (event) => {
      console.log("收到远程媒体流, 轨道类型:", event.track.kind);
      if (event.streams && event.streams[0]) {
        console.log("设置远程流");
        setRemoteStream(event.streams[0]);
      }
    };

    // 连接状态变化
    pc.onconnectionstatechange = () => {
      console.log("连接状态变化:", pc.connectionState);
      if (pc.connectionState === "connected") {
        console.log("WebRTC 连接已建立");
        updateConnectionState("connected");
        // 通知后端已连接
        if (socket && recordId) {
          socket.emit("call:connected", { recordId, userId });
        }
      } else if (pc.connectionState === "failed") {
        console.error("连接失败:", pc.connectionState);
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
        console.warn("连接断开或关闭:", pc.connectionState);
        // 如果是在通话中突然断开（不是正常挂断）
        if (isConnectedRef.current) {
          console.log("检测到通话中连接断开");
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
        console.log("开始创建 Offer, PeerConnection 状态:", pc.signalingState);
        const offer = await pc.createOffer();
        console.log("创建 Offer 成功:", offer);

        await pc.setLocalDescription(offer);
        console.log("设置本地描述成功");

        if (socket) {
          console.log("发送 Offer 给好友:", friendId);
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
        console.log("开始创建 Answer, PeerConnection 状态:", pc.signalingState);
        const answer = await pc.createAnswer();
        console.log("创建 Answer 成功:", answer);

        await pc.setLocalDescription(answer);
        console.log("设置本地描述成功");

        if (socket) {
          console.log("发送 Answer 给好友:", friendId);
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
        targetUserId: friendId, // 添加目标用户ID
      });
    }

    updateConnectionState("ended");
    onCallEnded?.();
  }, [
    localStream,
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
      console.log("初始化通话, isInitiator:", isInitiator);

      // 获取本地媒体流
      const stream = await initLocalStream();
      if (!stream) return;

      // 创建 PeerConnection
      const pc = createPeerConnection();

      // 添加本地流到 PeerConnection
      stream.getTracks().forEach((track) => {
        console.log("添加媒体轨道:", track.kind);
        pc.addTrack(track, stream);
      });

      if (isInitiator) {
        // 发起方：发送通话请求
        console.log("发起方：发送通话请求");
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
        console.log("接收方：发送接受信令");
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
      console.log("检测到标签页即将关闭，发送结束通话信令");
      // 立即通知对方通话结束
      if (socket && recordId) {
        socket.emit("call:end", {
          roomId,
          userId,
          recordId,
          endReason: "cancelled",
          targetUserId: friendId, // 添加目标用户ID
        });
      }
      // 停止所有媒体轨道
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
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
      console.log("对方已接受通话，开始创建 Offer");
      updateConnectionState("connecting");
      const pc = peerConnectionRef.current;
      if (pc) {
        console.log("PeerConnection 状态:", pc.signalingState);
        await createOffer(pc);
      } else {
        console.error("PeerConnection 不存在");
      }
    };

    // 接收 Offer
    const handleReceiveOffer = async (data: {
      offer: RTCSessionDescriptionInit;
      fromUserId: string;
    }) => {
      console.log("收到 Offer:", data);
      const pc = peerConnectionRef.current;
      if (pc) {
        try {
          console.log("设置远程描述 (Offer)");
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          console.log(
            "远程描述设置成功，PeerConnection 状态:",
            pc.signalingState
          );

          // 处理队列中的 ICE candidates
          console.log(
            "处理缓存的 ICE candidates, 数量:",
            iceCandidatesQueueRef.current.length
          );
          while (iceCandidatesQueueRef.current.length > 0) {
            const candidate = iceCandidatesQueueRef.current.shift();
            if (candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }

          // 创建 Answer
          await createAnswer(pc);
        } catch (err) {
          console.error("处理 Offer 失败:", err);
          setError("连接失败");
          updateConnectionState("error");
        }
      } else {
        console.error("PeerConnection 不存在");
      }
    };

    // 接收 Answer
    const handleReceiveAnswer = async (data: {
      answer: RTCSessionDescriptionInit;
      fromUserId: string;
    }) => {
      console.log("收到 Answer:", data);
      const pc = peerConnectionRef.current;
      if (pc) {
        try {
          console.log("设置远程描述 (Answer)");
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log(
            "远程描述设置成功，PeerConnection 状态:",
            pc.signalingState
          );

          // 处理队列中的 ICE candidates
          console.log(
            "处理缓存的 ICE candidates, 数量:",
            iceCandidatesQueueRef.current.length
          );
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
      } else {
        console.error("PeerConnection 不存在");
      }
    };

    // 接收 ICE Candidate
    const handleReceiveIce = async (data: {
      candidate: RTCIceCandidateInit;
      fromUserId: string;
    }) => {
      console.log("收到 ICE Candidate:", data);
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription) {
        try {
          console.log("添加 ICE Candidate");
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error("添加 ICE Candidate 失败:", err);
        }
      } else {
        // 如果还没有远程描述，先缓存 ICE candidate
        console.log("缓存 ICE Candidate（还没有远程描述）");
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
