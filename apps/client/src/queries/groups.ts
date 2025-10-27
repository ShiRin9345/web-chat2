import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Group, GroupMember } from "@workspace/database";

const API_BASE = "http://localhost:3001/api";

// 群成员信息类型（包含用户信息）
export interface GroupMemberWithUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  code: string | null;
  role: string;
  joinedAt: Date;
}

// 获取群聊列表
export function useGroups() {
  return useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/groups`, {
        withCredentials: true, // 发送 cookies
      });
      return response.data;
    },
  });
}

// 创建群聊
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      avatar,
      memberIds,
    }: {
      name: string;
      avatar?: string;
      memberIds?: string[];
    }) => {
      const response = await axios.post(
        `${API_BASE}/groups`,
        { name, avatar, memberIds },
        {
          withCredentials: true, // 发送 cookies
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

// 加入群聊
export function useJoinGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const response = await axios.post(
        `${API_BASE}/groups/${groupId}/join`,
        {},
        {
          withCredentials: true, // 发送 cookies
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

// 获取群成员列表
export function useGroupMembers(groupId: string) {
  return useQuery<GroupMemberWithUser[]>({
    queryKey: ["groupMembers", groupId],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE}/groups/${groupId}/members`,
        {
          withCredentials: true, // 发送 cookies
        }
      );
      return response.data;
    },
    enabled: !!groupId,
  });
}

// 退出群聊
export function useLeaveGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const response = await axios.delete(
        `${API_BASE}/groups/${groupId}/leave`,
        {
          withCredentials: true, // 发送 cookies
        }
      );
      return response.data;
    },
    onSuccess: (_, groupId) => {
      // 刷新群聊列表
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      // 刷新群成员列表
      queryClient.invalidateQueries({ queryKey: ["groupMembers", groupId] });
      // 清除该群的消息缓存
      queryClient.invalidateQueries({
        queryKey: ["messages", `group-${groupId}`],
      });
    },
  });
}

// 修改成员角色（仅群主）
export function useChangeMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      memberId,
      role,
    }: {
      groupId: string;
      memberId: string;
      role: "admin" | "member";
    }) => {
      const response = await axios.patch(
        `${API_BASE}/groups/${groupId}/members/${memberId}/role`,
        { role },
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    onSuccess: (_, { groupId }) => {
      // 刷新群成员列表
      queryClient.invalidateQueries({ queryKey: ["groupMembers", groupId] });
    },
  });
}

// 踢出成员（管理员及以上）
export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      memberId,
    }: {
      groupId: string;
      memberId: string;
    }) => {
      const response = await axios.delete(
        `${API_BASE}/groups/${groupId}/members/${memberId}`,
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    onSuccess: (_, { groupId }) => {
      // 刷新群成员列表
      queryClient.invalidateQueries({ queryKey: ["groupMembers", groupId] });
    },
  });
}
