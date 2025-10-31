import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

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
      const session = await authClient.getSession();
      if (!session) {
        throw new Error("未登录");
      }

      const response = await fetch(`${API_BASE_URL}/api/users/profile/tags`, {
        headers: {
          Authorization: `Bearer ${session.session.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("获取用户标签失败");
      }

      return response.json();
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
      const session = await authClient.getSession();
      if (!session) {
        throw new Error("未登录");
      }

      const response = await fetch(`${API_BASE_URL}/api/users/profile/tags`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.token}`,
        },
        body: JSON.stringify({ tags }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "更新标签失败");
      }

      return response.json();
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
      const url = new URL(`${API_BASE_URL}/api/tags/predefined`);
      if (category) {
        url.searchParams.set("category", category);
      }

      const session = await authClient.getSession();
      if (!session) {
        throw new Error("未登录");
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${session.session.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("获取预定义标签失败");
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
}
