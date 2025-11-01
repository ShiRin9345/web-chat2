import {
  Outlet,
  createRootRouteWithContext,
  useLocation,
} from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { ThemeProvider as NextThemesProvider } from "@/providers/theme-provider";
import { useEffect } from "react";

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
      // 非认证路由：应用 globals 主题
      import("@workspace/ui/globals.css").then(() => {
        // 移除其他主题类名
        const themeNames = [
          "orange",
          "quantum-rose",
          "claude",
          "amethyst-haze",
          "bold-tech",
          "kodama-grove",
          "soft-pop",
          "starry-night",
          "bugglegum",
        ];
        themeNames.forEach((name) => {
          rootElement.classList.remove(`theme-${name}`);
        });
        // 确保 globals 主题被应用
        rootElement.classList.add("theme-globals");
      });
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
