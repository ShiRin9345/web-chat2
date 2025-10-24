import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.ts";

config({ path: "../.env.local" });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);
app.use(express.json());

app.all("/api/auth/*", toNodeHandler(auth));

// Health check
app.get("/check", (req, res) => {
  res.send("Hello World");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
