import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  trustedOrigins: ["http://localhost:3000"],
  baseURL: process.env.BASE_URL || "http://localhost:3001",
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "your-super-secret-key-change-this-in-production",
});
