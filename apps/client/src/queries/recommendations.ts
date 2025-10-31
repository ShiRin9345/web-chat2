import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE } from "@/lib/api-config";

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
      const response = await axios.get<RecommendationsResponse>(
        `${API_BASE}/recommendations/friends`,
        {
          params: { limit },
          withCredentials: true,
        }
      );
      return response.data;
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
