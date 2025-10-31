import { Router } from "express";
import { getCallHistory } from "@/services/callRecords";
import { authenticateUser } from "@/middleware/auth";

export const callsRouter = Router();

// 获取通话历史
callsRouter.get("/history", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "未授权" });
    }

    const page = Number.parseInt(req.query.page as string) || 1;
    const limit = Number.parseInt(req.query.limit as string) || 20;

    const records = await getCallHistory(userId, page, limit);

    res.json({ records });
  } catch (error) {
    console.error("获取通话历史失败:", error);
    res.status(500).json({ error: "获取通话历史失败" });
  }
});
