import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/")({
  beforeLoad: () => {
    // 如果直接访问 /settings/，重定向到 /settings/general
    throw redirect({ to: "/settings/general", replace: true });
  },
});

