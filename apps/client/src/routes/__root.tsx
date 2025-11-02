import {
  Outlet,
  createRootRouteWithContext,
  useLocation,
} from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { ThemeProvider as NextThemesProvider } from "@/providers/theme-provider";
import { useEffect } from "react";
import { themeConfig } from "@/data/themeConfig";
import "@workspace/ui/theme-base.css";

interface MyRouterContext {
  auth: typeof authClient;
}

function RootComponent() {
  const location = useLocation();

  // 为非认证路由（signIn、signUp）应用默认的 globals 主题
  useEffect(() => {
    const isAuthRoute =
      location.pathname.startsWith("/messages") ||
      location.pathname.startsWith("/contacts") ||
      location.pathname.startsWith("/settings") ||
      location.pathname.startsWith("/assistant") ||
      location.pathname === "/";

    const rootElement = document.documentElement;

    if (!isAuthRoute) {
      // 非认证路由：应用 globals 主题的 light 模式（使用内联样式）
      const globalsTheme = themeConfig.globals;
      if (globalsTheme) {
        const globalsVars = globalsTheme.light;
        Object.entries(globalsVars).forEach(([key, value]) => {
          rootElement.style.setProperty(key, value);
        });
      }
    }
  }, [location.pathname]);

  return (
    <>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Outlet />
      </NextThemesProvider>
    </>
  );
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
});
