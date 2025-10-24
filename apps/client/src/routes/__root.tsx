import {
  Outlet,
  createRootRouteWithContext,
  redirect,
} from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";

import type { QueryClient } from "@tanstack/react-query";

interface MyRouterContext {
  queryClient: QueryClient;
  auth: {
    user: any | null;
    isLoading: boolean;
  };
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async ({ location, context }) => {
    // 检查当前路径是否为公开路由
    const publicRoutes = ["/signIn", "/signUp"];
    const isPublicRoute = publicRoutes.includes(location.pathname);

    try {
      const { data: session } = await authClient.getSession();

      // 如果已登录且访问公开路由，重定向到首页
      if (session?.user && isPublicRoute) {
        throw redirect({ to: "/" });
      }

      // 如果未登录且访问受保护路由，重定向到注册页
      if (!session?.user && !isPublicRoute) {
        throw redirect({ to: "/signUp" });
      }

      return {
        ...context,
        auth: {
          user: session?.user || null,
          isLoading: false,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("redirect")) {
        throw error;
      }

      // 如果获取会话失败，重定向到注册页
      if (!isPublicRoute) {
        throw redirect({ to: "/signUp" });
      }

      return {
        ...context,
        auth: {
          user: null,
          isLoading: false,
        },
      };
    }
  },
  component: () => (
    <>
      <Outlet />
    </>
  ),
});
