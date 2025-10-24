import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    const session = await context.auth.getSession();
    if (!session?.data?.user) {
      throw redirect({ to: "/signIn" });
    }
    // 重定向到消息页面
    throw redirect({ to: "/messages" });
  },
});
