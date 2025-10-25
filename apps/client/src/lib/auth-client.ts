import { createAuthClient } from "better-auth/react";
import { customSessionClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3001",
  plugins: [customSessionClient()],
  fetchOptions: {
    onError: (ctx) => {
      console.error("Auth error:", ctx.error);
    },
  },
});
