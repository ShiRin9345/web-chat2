import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3001",
  fetchOptions: {
    onError: (ctx) => {
      console.error("Auth error:", ctx.error);
    },
  },
});
