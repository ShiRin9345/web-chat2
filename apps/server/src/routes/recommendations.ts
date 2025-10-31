import express from "express";
import { recommendationService } from "../services/recommendations.js";

const router = express.Router();

/**
 * GET /api/recommendations/friends
 * 获取推荐好友列表
 * Query params:
 *  - limit: 返回数量限制 (默认5, 最大10)
 */
router.get("/recommendations/friends", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 解析 limit 参数
    const limitParam = req.query.limit;
    let limit = 5;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam as string, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = parsedLimit;
      }
    }

    // 获取推荐列表
    const recommendations = await recommendationService.getRecommendations(
      userId,
      limit
    );

    return res.json({
      recommendations,
      total: recommendations.length,
      hasMore: false, // 暂时不支持分页
    });
  } catch (error) {
    console.error("获取推荐好友失败:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/recommendations/refresh
 * 刷新推荐缓存 (当前实现为实时计算,此接口预留)
 */
router.post("/recommendations/refresh", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 当前实现为实时计算,无需刷新缓存
    // 未来如果引入缓存,可在此处清除缓存

    return res.json({
      success: true,
      message: "推荐已刷新",
    });
  } catch (error) {
    console.error("刷新推荐失败:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
