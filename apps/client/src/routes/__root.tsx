import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

interface MyRouterContext {
  auth: typeof authClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <Outlet />
    </>
  ),
});
