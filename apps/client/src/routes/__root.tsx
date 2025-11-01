import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { ThemeProvider as NextThemesProvider } from "@/providers/theme-provider";
import { ThemeProvider } from "@/providers/ThemeProvider";

interface MyRouterContext {
  auth: typeof authClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ThemeProvider>
          <Outlet />
        </ThemeProvider>
      </NextThemesProvider>
    </>
  ),
});
