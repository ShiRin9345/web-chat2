import { queryOptions } from "@tanstack/react-query";
import axios from "axios";
import type { User } from "@workspace/database";
import { API_BASE } from "@/lib/api-config";

/**
 * 获取用户信息的查询配置
 * @param userId - 用户 ID
 */
export const userQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["user", userId],
    queryFn: async () => {
      const response = await axios.get<User>(
        `${API_BASE}/friends/user/${userId}`,
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
