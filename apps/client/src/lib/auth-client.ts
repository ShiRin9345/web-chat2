import { createAuthClient } from "better-auth/react";
import { customSessionClient } from "better-auth/client/plugins";
import { AUTH_BASE_URL } from "./api-config";

export const authClient = createAuthClient({
  baseURL: AUTH_BASE_URL,
  plugins: [customSessionClient()],
  fetchOptions: {
    onError: (ctx) => {
      console.error("Auth error:", ctx.error);
    },
  },
});
