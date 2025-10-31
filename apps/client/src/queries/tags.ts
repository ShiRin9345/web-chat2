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
 * 预定义标签分类接口
 */
export interface PredefinedTagCategory {
  category: string;
  displayName: string;
  tags: Array<{
    name: string;
    displayName: string;
    usageCount: number;
  }>;
}

export interface PredefinedTagsResponse {
  categories: PredefinedTagCategory[];
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

/**
 * 获取预定义标签列表
 */
export function usePredefinedTags(category?: string) {
  return useQuery({
    queryKey: ["tags", "predefined", category],
    queryFn: async (): Promise<PredefinedTagsResponse> => {
      const params = category ? { category } : undefined;
      const response = await axios.get<PredefinedTagsResponse>(
        `${API_BASE}/tags/predefined`,
        {
          params,
          withCredentials: true,
        }
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
}
