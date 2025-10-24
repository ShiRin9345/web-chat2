import { authClient } from "@/lib/auth-client";
import { redirect } from "@tanstack/react-router";

export default async function checkAuth() {
  const session = await authClient.getSession();
  if (!session?.data?.user) {
    throw redirect({ to: "/signIn" });
  }
}
