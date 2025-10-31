import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

/**
 * 推荐用户接口
 */
export interface RecommendedUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  tags: string[];
  similarity: number;
  commonTags: string[];
}

export interface RecommendationsResponse {
  recommendations: RecommendedUser[];
  total: number;
  hasMore: boolean;
}

/**
 * 获取推荐好友列表
 */
export function useRecommendations(limit: number = 5) {
  return useQuery({
    queryKey: ["recommendations", "friends", limit],
    queryFn: async (): Promise<RecommendationsResponse> => {
      const session = await authClient.getSession();
      if (!session) {
        throw new Error("未登录");
      }

      const url = new URL(`${API_BASE_URL}/api/recommendations/friends`);
      url.searchParams.set("limit", limit.toString());

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${session.session.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("获取推荐好友失败");
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2分钟缓存
  });
}

/**
 * 刷新推荐列表
 */
export function useRefreshRecommendations() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["recommendations"] });
  };
}
