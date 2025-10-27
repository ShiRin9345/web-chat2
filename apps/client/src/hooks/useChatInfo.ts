import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/providers/SocketProvider";
import { useCallStore } from "@/stores/call";
import { userQueryOptions } from "@/queries/users";
import type { User, Group } from "@workspace/database";

interface UseChatInfoParams {
  chatId: string;
}

interface ChatInfo {
  type: "friend" | "group" | "unknown";
  id: string;
  name: string;
  avatar: string | null;
  isOnline: boolean;
  creatorId?: string; // 群主 ID（仅群聊）
}

interface UseChatInfoReturn {
  chatInfo: ChatInfo;
  handleVideoCall: () => void;
  handleAudioCall: () => void;
}

/**
 * 聊天信息管理 Hook
 *
 * 功能:
 * - 解析 chatId 获取聊天类型和实际 ID
 * - 加载好友信息(已在 loader 中预加载)
 * - 监听在线状态
 * - 提供发起音视频通话的方法
 *
 * @param chatId - 聊天 ID (格式: "friend-{id}" 或 "group-{id}")
 */
export function useChatInfo({ chatId }: UseChatInfoParams): UseChatInfoReturn {
  const socket = useSocket();
  const { startCall } = useCallStore();
  const queryClient = useQueryClient();
  const [onlineFriends, setOnlineFriends] = useState<string[]>([]);

  // 解析 chatId
  const { type, id } = useMemo(() => {
    if (chatId.startsWith("friend-")) {
      return { type: "friend" as const, id: chatId.replace("friend-", "") };
    }
    if (chatId.startsWith("group-")) {
      return { type: "group" as const, id: chatId.replace("group-", "") };
    }
    return { type: "unknown" as const, id: chatId };
  }, [chatId]);

  // 优先从 friends 缓存中获取用户信息，避免重复请求
  const friendInfo = useMemo(() => {
    if (type !== "friend" || !id) return null;

    // 先从 friends 缓存中查找
    const friendsData = queryClient.getQueryData<User[]>(["friends"]);
    if (friendsData) {
      const friend = friendsData.find((f) => f.id === id);
      if (friend) return friend;
    }

    // 如果 friends 缓存中没有，再从 user 缓存中查找
    return queryClient.getQueryData<User>(userQueryOptions(id).queryKey);
  }, [type, id, queryClient]);

  // 从 groups 缓存中获取群聊信息
  const groupInfo = useMemo(() => {
    if (type !== "group" || !id) return null;

    // 从 groups 缓存中查找
    const groupsData = queryClient.getQueryData<Group[]>(["groups"]);
    if (groupsData) {
      const group = groupsData.find((g) => g.id === id);
      if (group) return group;
    }

    return null;
  }, [type, id, queryClient]);

  // 只有在缓存中没有找到时才发起请求
  const { data: fetchedFriendInfo } = useQuery({
    ...userQueryOptions(id),
    enabled: type === "friend" && !!id && !friendInfo, // 仅在缓存中没有数据时启用查询
  });

  // 使用缓存的数据或新获取的数据
  const finalFriendInfo = friendInfo || fetchedFriendInfo;

  // 监听在线状态
  useEffect(() => {
    if (!socket) return;

    const handleFriendOnline = (friendId: string) => {
      setOnlineFriends((prev) => [...new Set([...prev, friendId])]);
    };

    const handleFriendOffline = (friendId: string) => {
      setOnlineFriends((prev) => prev.filter((fid) => fid !== friendId));
    };

    socket.on("friend:online", handleFriendOnline);
    socket.on("friend:offline", handleFriendOffline);

    // 获取在线好友列表
    socket.emit("user:get-online-friends", (friendIds: string[]) => {
      setOnlineFriends(friendIds);
    });

    return () => {
      socket.off("friend:online", handleFriendOnline);
      socket.off("friend:offline", handleFriendOffline);
    };
  }, [socket]);

  // 计算聊天信息
  const chatInfo = useMemo<ChatInfo>(() => {
    const isOnline = type === "friend" && onlineFriends.includes(id);

    return {
      type,
      id,
      name:
        type === "friend" && finalFriendInfo
          ? finalFriendInfo.name
          : type === "group" && groupInfo
          ? groupInfo.name
          : type === "group"
          ? "群聊"
          : "未知",
      avatar:
        type === "friend" && finalFriendInfo
          ? finalFriendInfo.image
          : type === "group" && groupInfo
          ? groupInfo.avatar
          : null,
      isOnline,
      creatorId:
        type === "group" && groupInfo ? groupInfo.creatorId : undefined,
    };
  }, [type, id, finalFriendInfo, groupInfo, onlineFriends]);

  // 发起视频通话
  const handleVideoCall = () => {
    if (type !== "friend") {
      alert("仅支持与好友进行通话");
      return;
    }

    if (!chatInfo.isOnline) {
      alert("对方当前不在线");
      return;
    }

    if (!navigator.mediaDevices) {
      alert("您的浏览器不支持通话功能");
      return;
    }

    startCall({
      roomId: chatId,
      friendId: id,
      friendName: chatInfo.name,
      friendAvatar: chatInfo.avatar || undefined,
      callType: "video",
      isInitiator: true,
    });
  };

  // 发起语音通话
  const handleAudioCall = () => {
    if (type !== "friend") {
      alert("仅支持与好友进行通话");
      return;
    }

    if (!chatInfo.isOnline) {
      alert("对方当前不在线");
      return;
    }

    if (!navigator.mediaDevices) {
      alert("您的浏览器不支持通话功能");
      return;
    }

    startCall({
      roomId: chatId,
      friendId: id,
      friendName: chatInfo.name,
      friendAvatar: chatInfo.avatar || undefined,
      callType: "audio",
      isInitiator: true,
    });
  };

  return {
    chatInfo,
    handleVideoCall,
    handleAudioCall,
  };
}
