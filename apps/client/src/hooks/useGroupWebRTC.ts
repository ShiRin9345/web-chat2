import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "@/providers/SocketProvider";
import { useQueryClient } from "@tanstack/react-query";
import { userQueryOptions } from "@/queries/users";
import type { ConnectionState } from "./useWebRTC";

interface UseGroupWebRTCProps {
  roomId: string;
  groupId: string;
  userId: string;
  callType: "video" | "audio";
  isInitiator: boolean;
  recordId?: string;
  onParticipantJoined?: (userId: string) => void;
  onParticipantLeft?: (userId: string) => void;
  onCallEnded?: () => void;
}

interface ParticipantInfo {
  name: string;
  avatar: string | null;
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
      username: "admin",
      credential: "123456",
    },
  ],
};

export function useGroupWebRTC({
  roomId,
  groupId,
  userId,
  callType,
  isInitiator,
  recordId: initialRecordId,
  onParticipantJoined,
  onParticipantLeft,
  onCallEnded,
}: UseGroupWebRTCProps) {
  const socket = useSocket();
  const queryClient = useQueryClient();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map()
  );
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === "video");
  const [participantStates, setParticipantStates] = useState<
    Map<string, ConnectionState>
  >(new Map());
  const [participantInfo, setParticipantInfo] = useState<
    Map<string, ParticipantInfo>
  >(new Map());
  const [error, setError] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | undefined>(initialRecordId);

  // 使用 Map 存储每个参与者的 PeerConnection
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  // 使用 Map 存储每个参与者的 ICE candidates 队列
  const iceCandidatesQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map()
  );
  const localStreamRef = useRef<MediaStream | null>(null);
  const participantsRef = useRef<Set<string>>(new Set([userId]));

  // 初始化本地媒体流
  const initLocalStream = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === "video",
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error("获取媒体设备失败:", err);
      setError("无法访问摄像头或麦克风，请检查设备权限");
      return null;
    }
  }, [callType]);

  // 创建与特定参与者的 PeerConnection
  const createPeerConnectionForParticipant = useCallback(
    (targetUserId: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // 处理 ICE 候选
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log(`[群组] 发送 ICE Candidate 给 ${targetUserId}`);
          socket.emit("group:webrtc:ice-candidate", {
            roomId,
            groupId,
            candidate: event.candidate.toJSON(),
            senderUserId: userId,
            targetUserId,
          });
        }
      };

      // 接收远程流
      pc.ontrack = (event) => {
        console.log(
          `[群组] 收到来自 ${targetUserId} 的远程媒体流, 轨道类型:`,
          event.track.kind
        );
        if (event.streams && event.streams.length > 0 && event.streams[0]) {
          const stream = event.streams[0];
          setRemoteStreams((prev) => {
            const newMap = new Map(prev);
            newMap.set(targetUserId, stream);
            return newMap;
          });
          onParticipantJoined?.(targetUserId);
        }
      };

      // 连接状态变化
      pc.onconnectionstatechange = () => {
        console.log(
          `[群组] 与 ${targetUserId} 的连接状态变化:`,
          pc.connectionState
        );
        setParticipantStates((prev) => {
          const newMap = new Map(prev);
          if (pc.connectionState === "connected") {
            newMap.set(targetUserId, "connected");
          } else if (pc.connectionState === "failed") {
            newMap.set(targetUserId, "error");
          } else if (
            pc.connectionState === "disconnected" ||
            pc.connectionState === "closed"
          ) {
            newMap.set(targetUserId, "ended");
          }
          return newMap;
        });
      };

      peerConnectionsRef.current.set(targetUserId, pc);
      return pc;
    },
    [roomId, groupId, userId, socket, onParticipantJoined]
  );

  // 创建 Offer 发送给特定参与者
  const createOfferForParticipant = useCallback(
    async (pc: RTCPeerConnection, targetUserId: string) => {
      try {
        console.log(
          `[群组] 开始创建 Offer 给 ${targetUserId}, PeerConnection 状态:`,
          pc.signalingState
        );
        const offer = await pc.createOffer();
        console.log(`[群组] 创建 Offer 成功 (${targetUserId})`);

        await pc.setLocalDescription(offer);

        if (socket) {
          console.log(`[群组] 发送 Offer 给 ${targetUserId}`);
          socket.emit("group:webrtc:offer", {
            roomId,
            groupId,
            offer: offer,
            senderUserId: userId,
            targetUserId,
          });
        }
      } catch (err) {
        console.error(`[群组] 创建 Offer 失败 (${targetUserId}):`, err);
        setParticipantStates((prev) => {
          const newMap = new Map(prev);
          newMap.set(targetUserId, "error");
          return newMap;
        });
      }
    },
    [socket, roomId, groupId, userId]
  );

  // 创建 Answer 发送给特定参与者
  const createAnswerForParticipant = useCallback(
    async (pc: RTCPeerConnection, targetUserId: string) => {
      try {
        console.log(
          `[群组] 开始创建 Answer 给 ${targetUserId}, PeerConnection 状态:`,
          pc.signalingState
        );
        const answer = await pc.createAnswer();
        console.log(`[群组] 创建 Answer 成功 (${targetUserId})`);

        await pc.setLocalDescription(answer);

        if (socket) {
          console.log(`[群组] 发送 Answer 给 ${targetUserId}`);
          socket.emit("group:webrtc:answer", {
            roomId,
            groupId,
            answer: answer,
            senderUserId: userId,
            targetUserId,
          });
        }
      } catch (err) {
        console.error(`[群组] 创建 Answer 失败 (${targetUserId}):`, err);
        setParticipantStates((prev) => {
          const newMap = new Map(prev);
          newMap.set(targetUserId, "error");
          return newMap;
        });
      }
    },
    [socket, roomId, groupId, userId]
  );

  // 切换音频
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log(
          "🎤 [群组] 音频状态:",
          audioTrack.enabled ? "开启" : "关闭"
        );
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
        console.log(
          "📹 [群组] 视频状态:",
          videoTrack.enabled ? "开启" : "关闭"
        );
      }
    }
  }, [callType]);

  // 离开通话（不关闭整个通话）
  const leaveCall = useCallback(() => {
    console.log("📞 [群组] 离开通话，清理资源...");

    // 停止本地媒体流
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    // 关闭所有 PeerConnection
    peerConnectionsRef.current.forEach((pc, targetUserId) => {
      console.log(`🔌 [群组] 关闭与 ${targetUserId} 的连接`);
      pc.close();
    });
    peerConnectionsRef.current.clear();

    // 清理远程流
    setRemoteStreams(new Map());

    // 发送离开信令
    if (socket) {
      socket.emit("group:call:leave", {
        roomId,
        groupId,
        userId,
      });
    }

    onCallEnded?.();
  }, [socket, roomId, groupId, userId, onCallEnded]);

  // 初始化通话
  useEffect(() => {
    if (!socket) return;

    const init = async () => {
      console.log("[群组] 初始化通话, isInitiator:", isInitiator);

      // 获取本地媒体流
      const stream = await initLocalStream();
      if (!stream) return;

      // 发起方创建通话，等待其他成员加入
      if (isInitiator) {
        console.log("[群组] 发起方：等待其他成员加入");
      }
    };

    init();

    // 清理函数
    return () => {
      console.log("🧹 [群组] useEffect 清理函数执行");
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        localStreamRef.current = null;
      }

      peerConnectionsRef.current.forEach((pc) => {
        pc.close();
      });
      peerConnectionsRef.current.clear();
    };
  }, [isInitiator, initLocalStream]);

  // Socket 事件监听
  useEffect(() => {
    if (!socket) return;

    // 接收通话记录 ID
    const handleRecordCreated = (data: { recordId: string }) => {
      setRecordId(data.recordId);
    };

    // 参与者加入
    const handleParticipantJoined = async (data: {
      userId: string;
      groupId: string;
      roomId: string;
      participantsCount: number;
    }) => {
      if (data.groupId !== groupId || data.userId === userId) return;

      console.log(`[群组] 参与者 ${data.userId} 加入通话`);
      participantsRef.current.add(data.userId);

      // 获取参与者用户信息
      try {
        // 先从缓存中查找
        let userInfo = queryClient.getQueryData(
          userQueryOptions(data.userId).queryKey
        );

        // 如果缓存中没有，发起查询
        if (!userInfo) {
          userInfo = await queryClient.fetchQuery(
            userQueryOptions(data.userId)
          );
        }

        // 更新参与者信息
        if (userInfo && typeof userInfo === "object" && "name" in userInfo) {
          setParticipantInfo((prev) => {
            const newMap = new Map(prev);
            newMap.set(data.userId, {
              name: (userInfo as any).name || data.userId,
              avatar: (userInfo as any).image || null,
            });
            return newMap;
          });
        }
      } catch (error) {
        console.error(`获取参与者 ${data.userId} 信息失败:`, error);
        // 即使获取失败，也设置默认信息
        setParticipantInfo((prev) => {
          const newMap = new Map(prev);
          newMap.set(data.userId, {
            name: data.userId,
            avatar: null,
          });
          return newMap;
        });
      }

      // 如果本地流已准备好，与新成员建立连接
      if (localStreamRef.current) {
        const pc = createPeerConnectionForParticipant(data.userId);

        // 添加本地流到 PeerConnection
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });

        // 向新成员发送 Offer
        await createOfferForParticipant(pc, data.userId);
      }
    };

    // 参与者离开
    const handleParticipantLeft = (data: {
      userId: string;
      groupId: string;
      roomId: string;
      participantsCount: number;
    }) => {
      if (data.groupId !== groupId || data.userId === userId) return;

      console.log(`[群组] 参与者 ${data.userId} 离开通话`);
      participantsRef.current.delete(data.userId);

      // 关闭与该参与者的连接
      const pc = peerConnectionsRef.current.get(data.userId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(data.userId);
      }

      // 移除远程流
      setRemoteStreams((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });

      // 清理状态
      setParticipantStates((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });

      onParticipantLeft?.(data.userId);
    };

    // 通话结束
    const handleCallEnd = (data: {
      groupId: string;
      roomId: string;
      reason: string;
    }) => {
      if (data.groupId !== groupId) return;

      console.log("[群组] 通话已结束:", data.reason);
      leaveCall();
    };

    // 接收群组 WebRTC Offer
    const handleReceiveOffer = async (data: {
      offer: RTCSessionDescriptionInit;
      senderUserId: string;
      targetUserId: string;
      roomId: string;
      groupId: string;
    }) => {
      if (data.groupId !== groupId || data.targetUserId !== userId) return;

      console.log(`[群组] 收到来自 ${data.senderUserId} 的 Offer`);

      // 获取发送者用户信息（如果还没有）
      if (!participantInfo.has(data.senderUserId)) {
        try {
          let userInfo = queryClient.getQueryData(
            userQueryOptions(data.senderUserId).queryKey
          );

          if (!userInfo) {
            userInfo = await queryClient.fetchQuery(
              userQueryOptions(data.senderUserId)
            );
          }

          if (userInfo && typeof userInfo === "object" && "name" in userInfo) {
            setParticipantInfo((prev) => {
              const newMap = new Map(prev);
              newMap.set(data.senderUserId, {
                name: (userInfo as any).name || data.senderUserId,
                avatar: (userInfo as any).image || null,
              });
              return newMap;
            });
          }
        } catch (error) {
          console.error(`获取发送者 ${data.senderUserId} 信息失败:`, error);
        }
      }

      let pc = peerConnectionsRef.current.get(data.senderUserId);
      if (!pc) {
        // 创建新的 PeerConnection
        pc = createPeerConnectionForParticipant(data.senderUserId);

        // 添加本地流
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => {
            pc!.addTrack(track, localStreamRef.current!);
          });
        }
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        // 处理缓存的 ICE candidates
        const queue =
          iceCandidatesQueuesRef.current.get(data.senderUserId) || [];
        while (queue.length > 0) {
          const candidate = queue.shift();
          if (candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }

        // 创建 Answer
        await createAnswerForParticipant(pc, data.senderUserId);
      } catch (err) {
        console.error(`[群组] 处理 Offer 失败 (${data.senderUserId}):`, err);
      }
    };

    // 接收群组 WebRTC Answer
    const handleReceiveAnswer = async (data: {
      answer: RTCSessionDescriptionInit;
      senderUserId: string;
      targetUserId: string;
      roomId: string;
      groupId: string;
    }) => {
      if (data.groupId !== groupId || data.targetUserId !== userId) return;

      console.log(`[群组] 收到来自 ${data.senderUserId} 的 Answer`);

      const pc = peerConnectionsRef.current.get(data.senderUserId);
      if (!pc) {
        console.error(`[群组] PeerConnection 不存在 (${data.senderUserId})`);
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

        // 处理缓存的 ICE candidates
        const queue =
          iceCandidatesQueuesRef.current.get(data.senderUserId) || [];
        while (queue.length > 0) {
          const candidate = queue.shift();
          if (candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }
      } catch (err) {
        console.error(`[群组] 处理 Answer 失败 (${data.senderUserId}):`, err);
      }
    };

    // 接收群组 WebRTC ICE Candidate
    const handleReceiveIce = async (data: {
      candidate: RTCIceCandidateInit;
      senderUserId: string;
      targetUserId: string;
      roomId: string;
      groupId: string;
    }) => {
      if (data.groupId !== groupId || data.targetUserId !== userId) return;

      const pc = peerConnectionsRef.current.get(data.senderUserId);
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error(
            `[群组] 添加 ICE Candidate 失败 (${data.senderUserId}):`,
            err
          );
        }
      } else {
        // 缓存 ICE candidate
        const queue =
          iceCandidatesQueuesRef.current.get(data.senderUserId) || [];
        queue.push(data.candidate);
        iceCandidatesQueuesRef.current.set(data.senderUserId, queue);
      }
    };

    // 已加入通话
    const handleJoined = async (data: {
      roomId: string;
      groupId: string;
      participantsCount: number;
    }) => {
      if (data.groupId !== groupId) return;

      console.log(`[群组] 已加入通话，参与者数量: ${data.participantsCount}`);

      // 获取本地流
      if (!localStreamRef.current) {
        const stream = await initLocalStream();
        if (!stream) return;
      }

      // 注意：由于是 mesh 拓扑，我们等待现有成员向我们发送 Offer
      // 同时，我们也等待 participant-joined 事件来建立与新成员的连接
    };

    socket.on("group:call:record-created", handleRecordCreated);
    socket.on("group:call:participant-joined", handleParticipantJoined);
    socket.on("group:call:participant-left", handleParticipantLeft);
    socket.on("group:call:end", handleCallEnd);
    socket.on("group:call:joined", handleJoined);
    socket.on("group:webrtc:receive-offer", handleReceiveOffer);
    socket.on("group:webrtc:receive-answer", handleReceiveAnswer);
    socket.on("group:webrtc:receive-ice", handleReceiveIce);

    return () => {
      socket.off("group:call:record-created", handleRecordCreated);
      socket.off("group:call:participant-joined", handleParticipantJoined);
      socket.off("group:call:participant-left", handleParticipantLeft);
      socket.off("group:call:end", handleCallEnd);
      socket.off("group:call:joined", handleJoined);
      socket.off("group:webrtc:receive-offer", handleReceiveOffer);
      socket.off("group:webrtc:receive-answer", handleReceiveAnswer);
      socket.off("group:webrtc:receive-ice", handleReceiveIce);
    };
  }, [
    socket,
    roomId,
    groupId,
    userId,
    createPeerConnectionForParticipant,
    createOfferForParticipant,
    createAnswerForParticipant,
    initLocalStream,
    leaveCall,
    onParticipantLeft,
  ]);

  return {
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    participantStates,
    participantInfo,
    toggleAudio,
    toggleVideo,
    leaveCall,
    error,
  };
}
