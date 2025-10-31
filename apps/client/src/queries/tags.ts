import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE } from "@/lib/api-config";

/**
 * 用户标签接口
 */
export interface UserTags {
  tags: string[];
  updatedAt: string | null;
}

/**
 * 获取当前用户标签
 */
export function useUserTags() {
  return useQuery({
    queryKey: ["user", "tags"],
    queryFn: async (): Promise<UserTags> => {
      const response = await axios.get<UserTags>(
        `${API_BASE}/users/profile/tags`,
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
  });
}

/**
 * 更新用户标签
 */
export function useUpdateUserTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tags: string[]): Promise<UserTags> => {
      const response = await axios.put<UserTags>(
        `${API_BASE}/users/profile/tags`,
        { tags },
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      // 刷新用户标签缓存
      queryClient.invalidateQueries({ queryKey: ["user", "tags"] });
      // 刷新推荐列表缓存
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
}
