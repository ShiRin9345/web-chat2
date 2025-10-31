import express from "express";
import { tagService, TagValidationError } from "../services/tags.js";
import { authenticateUser } from "@/middleware/auth";

const router = express.Router();

/**
 * GET /api/users/profile/tags
 * 获取当前用户的标签
 */
router.get("/users/profile/tags", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userTags = await tagService.getUserTags(userId);

    if (!userTags) {
      return res.json({
        tags: [],
        updatedAt: null,
      });
    }

    return res.json({
      tags: userTags.tags,
      updatedAt: userTags.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("获取用户标签失败:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/users/profile/tags
 * 更新当前用户的标签
 */
router.put("/users/profile/tags", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: "tags 必须是数组" });
    }

    // 验证并更新标签
    const result = await tagService.updateUserTags(userId, tags);

    return res.json({
      success: true,
      tags: result.tags,
      updatedAt: result.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof TagValidationError) {
      return res.status(400).json({ error: error.message });
    }

    console.error("更新用户标签失败:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
