import { db } from "@workspace/database";
import { userTags, predefinedTags } from "@workspace/database";
import { eq, sql } from "drizzle-orm";
import { embeddingService } from "./embedding.js";

/**
 * 标签验证错误
 */
export class TagValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TagValidationError";
  }
}

/**
 * 标签管理服务
 */
export class TagService {
  /**
   * 验证标签
   * @param tags 标签数组
   * @throws TagValidationError
   */
  validateTags(tags: string[]): void {
    // 数量验证: 1-8 个
    if (tags.length < 1 || tags.length > 8) {
      throw new TagValidationError("标签数量必须在 1-8 个之间");
    }

    // 去重检查
    const uniqueTags = new Set(tags);
    if (uniqueTags.size !== tags.length) {
      throw new TagValidationError("标签不能重复");
    }

    // 每个标签验证
    for (const tag of tags) {
      // 长度验证: 1-20 字符
      if (tag.length < 1 || tag.length > 20) {
        throw new TagValidationError(`标签 "${tag}" 长度必须在 1-20 个字符之间`);
      }

      // 字符验证: 只允许中文、英文、数字
      const validPattern = /^[\u4e00-\u9fa5a-zA-Z0-9]+$/;
      if (!validPattern.test(tag)) {
        throw new TagValidationError(
          `标签 "${tag}" 只能包含中文、英文或数字`
        );
      }
    }
  }

  /**
   * 获取用户标签
   * @param userId 用户 ID
   * @returns 用户标签和更新时间,如果不存在返回 null
   */
  async getUserTags(userId: string): Promise<{
    tags: string[];
    updatedAt: Date;
  } | null> {
    const result = await db
      .select({
        tags: userTags.tags,
        updatedAt: userTags.updatedAt,
      })
      .from(userTags)
      .where(eq(userTags.userId, userId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return {
      tags: result[0].tags || [],
      updatedAt: result[0].updatedAt,
    };
  }

  /**
   * 更新用户标签
   * @param userId 用户 ID
   * @param tags 新标签数组
   * @returns 更新后的标签和时间
   */
  async updateUserTags(
    userId: string,
    tags: string[]
  ): Promise<{ tags: string[]; updatedAt: Date }> {
    // 验证标签
    this.validateTags(tags);

    // 检查用户是否已有标签记录
    const existing = await this.getUserTags(userId);

    let result;
    if (existing) {
      // 更新现有记录
      result = await db
        .update(userTags)
        .set({
          tags,
          updatedAt: new Date(),
        })
        .where(eq(userTags.userId, userId))
        .returning({
          tags: userTags.tags,
          updatedAt: userTags.updatedAt,
        });
    } else {
      // 插入新记录
      result = await db
        .insert(userTags)
        .values({
          userId,
          tags,
        })
        .returning({
          tags: userTags.tags,
          updatedAt: userTags.updatedAt,
        });
    }

    // 异步更新向量 (不阻塞响应)
    embeddingService
      .upsertUserVector(userId, tags)
      .catch((error) => {
        console.error(`更新用户 ${userId} 向量失败:`, error);
      });

    return {
      tags: result[0].tags || [],
      updatedAt: result[0].updatedAt,
    };
  }

  /**
   * 删除用户标签
   * @param userId 用户 ID
   */
  async deleteUserTags(userId: string): Promise<void> {
    await db.delete(userTags).where(eq(userTags.userId, userId));

    // 异步删除向量
    embeddingService.deleteUserVector(userId).catch((error) => {
      console.error(`删除用户 ${userId} 向量失败:`, error);
    });
  }

  /**
   * 获取预定义标签 (按分类分组)
   * @param category 可选,过滤指定分类
   * @returns 分类标签列表
   */
  async getPredefinedTags(category?: string): Promise<{
    categories: Array<{
      category: string;
      displayName: string;
      tags: Array<{ name: string; displayName: string; usageCount: number }>;
    }>;
  }> {
    const query = category
      ? db.select().from(predefinedTags).where(eq(predefinedTags.category, category))
      : db.select().from(predefinedTags);

    const tags = await query;

    // 按分类分组
    const categoryMap = new Map<
      string,
      {
        category: string;
        displayName: string;
        tags: Array<{ name: string; displayName: string; usageCount: number }>;
      }
    >();

    // 分类显示名映射
    const categoryDisplayNames: Record<string, string> = {
      sports: "运动健身",
      music: "音乐艺术",
      technology: "科技编程",
      reading: "阅读写作",
      travel: "旅行探索",
      food: "美食烹饪",
      gaming: "游戏电竞",
      lifestyle: "生活方式",
    };

    for (const tag of tags) {
      if (!categoryMap.has(tag.category)) {
        categoryMap.set(tag.category, {
          category: tag.category,
          displayName: categoryDisplayNames[tag.category] || tag.category,
          tags: [],
        });
      }

      categoryMap.get(tag.category)!.tags.push({
        name: tag.name,
        displayName: tag.displayName,
        usageCount: tag.usageCount,
      });
    }

    return {
      categories: Array.from(categoryMap.values()),
    };
  }

  /**
   * 增加标签使用次数
   * @param tagNames 标签名称数组
   */
  async incrementTagUsage(tagNames: string[]): Promise<void> {
    for (const name of tagNames) {
      try {
        await db
          .update(predefinedTags)
          .set({
            usageCount: sql`${predefinedTags.usageCount} + 1`,
          })
          .where(eq(predefinedTags.name, name));
      } catch (error) {
        // 忽略不存在的标签
        console.warn(`标签 "${name}" 不在预定义列表中`);
      }
    }
  }
}

// 导出单例
export const tagService = new TagService();
