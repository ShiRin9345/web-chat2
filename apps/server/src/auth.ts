import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { customSession } from "better-auth/plugins";
import {
  db,
  user as userTable,
  session,
  account,
  verification,
} from "@workspace/database";
import { eq } from "drizzle-orm";

// 生成唯一的 code
async function generateUniqueCode(): Promise<string> {
  const min = 1000000000;
  const max = 9999999999;

  while (true) {
    const code = Math.floor(Math.random() * (max - min + 1)) + min;
    const existing = await db
      .select()
      .from(userTable)
      .where(eq(userTable.code, code.toString()))
      .limit(1);
    if (existing.length === 0) {
      return code.toString();
    }
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: userTable,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 6,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
  },
  trustedOrigins: ["http://localhost:3000"],
  baseURL: "http://localhost:3001",
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "your-super-secret-key-change-this-in-production",
  plugins: [
    customSession(async ({ user, session }) => {
      // 从数据库查询用户的完整信息，包括 code 字段
      const fullUser = await db
        .select()
        .from(userTable)
        .where(eq(userTable.id, user.id))
        .limit(1);

      if (fullUser.length > 0 && fullUser[0]) {
        return {
          user: {
            ...user,
            code: fullUser[0].code, // 从数据库获取 code 字段
          },
          session,
        };
      }

      return {
        user: {
          ...user,
          code: (user as any).code,
        },
        session,
      };
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (userData) => {
          const code = await generateUniqueCode();
          await db
            .update(userTable)
            .set({ code })
            .where(eq(userTable.id, userData.id));
        },
      },
    },
  },
});
