import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { User, FriendRequest } from "@workspace/database";

const API_BASE = "http://localhost:3001/api";

// 获取好友列表
export function useFriends() {
  return useQuery<User[]>({
    queryKey: ["friends"],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/friends`, {
        withCredentials: true, // 发送 cookies
      });
      return response.data;
    },
  });
}

// 获取好友申请列表
export function useFriendRequests() {
  return useQuery<FriendRequest[]>({
    queryKey: ["friendRequests"],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/friends/requests`, {
        withCredentials: true, // 发送 cookies
      });
      return response.data;
    },
  });
}

// 搜索用户
export function useSearchUsers(searchQuery: string) {
  return useQuery<User[]>({
    queryKey: ["searchUsers", searchQuery],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE}/friends/search?q=${encodeURIComponent(searchQuery)}`,
        {
          withCredentials: true, // 发送 cookies
        }
      );
      return response.data;
    },
    enabled: !!searchQuery && searchQuery.length > 0,
  });
}

// 发送好友申请
export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      toUserId,
      message,
    }: {
      toUserId: string;
      message?: string;
    }) => {
      const response = await axios.post(
        `${API_BASE}/friends/request`,
        { toUserId, message },
        {
          withCredentials: true, // 发送 cookies
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });
}

// 接受好友申请
export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const response = await axios.post(
        `${API_BASE}/friends/accept/${requestId}`,
        {},
        {
          withCredentials: true, // 发送 cookies
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });
}

// 拒绝好友申请
export function useRejectFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const response = await axios.post(
        `${API_BASE}/friends/reject/${requestId}`,
        {},
        {
          withCredentials: true, // 发送 cookies
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
  });
}

// 删除好友
export function useRemoveFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendId: string) => {
      const response = await axios.delete(
        `${API_BASE}/friends/${friendId}`,
        {
          withCredentials: true, // 发送 cookies
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}
