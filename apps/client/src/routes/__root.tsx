import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { ThemeProvider } from "@/providers/theme-provider";

interface MyRouterContext {
  auth: typeof authClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Outlet />
      </ThemeProvider>
    </>
  ),
});
