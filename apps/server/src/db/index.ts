import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "dotenv";

config({ path: "../../.env.local" });

export const db = drizzle({
  connection: {
    connectionString: process.env.DATABASE_URL!,
    ssl: true,
  },
});
