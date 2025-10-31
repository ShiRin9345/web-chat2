import { db, friendships, user, userTags } from "@workspace/database";
import { eq, or, and, inArray } from "drizzle-orm";
import { embeddingService } from "./embedding.js";
import { tagService } from "./tags.js";

/**
 * 推荐用户接口
 */
export interface RecommendedUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  tags: string[];
  similarity: number;
  commonTags: string[];
}

/**
 * 推荐引擎服务
 */
export class RecommendationService {
  /**
   * 获取推荐好友列表
   * @param userId 当前用户 ID
   * @param limit 返回数量限制 (默认 5,最大 10)
   * @returns 推荐用户列表
   */
  async getRecommendations(
    userId: string,
    limit: number = 5
  ): Promise<RecommendedUser[]> {
    // 限制最大返回数量
    const finalLimit = Math.min(limit, 10);

    // 1. 查询用户标签
    const userTagsData = await tagService.getUserTags(userId);
    if (!userTagsData || userTagsData.tags.length === 0) {
      // 用户未设置标签,返回空列表
      return [];
    }

    // 2. 从 ChromaDB 查询相似用户 (取前 20 个候选)
    const { userIds: candidateUserIds, scores: similarityScores } =
      await embeddingService.searchSimilar(userId, 20);

    if (candidateUserIds.length === 0) {
      return [];
    }

    // 3. 查询用户的好友列表
    const friendIds = await this.getUserFriendIds(userId);

    // 4. 过滤候选用户
    const filteredCandidates = candidateUserIds.filter(
      (candidateId, index) => {
        // 过滤掉已是好友的用户
        if (friendIds.includes(candidateId)) {
          return false;
        }
        // 过滤相似度低于 0.6 的用户
        if (similarityScores[index] < 0.6) {
          return false;
        }
        return true;
      }
    );

    if (filteredCandidates.length === 0) {
      return [];
    }

    // 5. 批量查询候选用户的详细信息和标签
    const candidatesWithTags = await this.enrichUserInfo(filteredCandidates);

    // 6. 计算共同标签并构造推荐结果
    const recommendations: RecommendedUser[] = [];
    for (let i = 0; i < candidatesWithTags.length; i++) {
      const candidate = candidatesWithTags[i];
      const candidateIndex = candidateUserIds.indexOf(candidate.id);

      if (candidateIndex === -1) continue;

      const commonTags = this.calculateCommonTags(
        userTagsData.tags,
        candidate.tags
      );

      recommendations.push({
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        image: candidate.image,
        tags: candidate.tags,
        similarity: similarityScores[candidateIndex],
        commonTags,
      });
    }

    // 7. 按相似度降序排序
    recommendations.sort((a, b) => b.similarity - a.similarity);

    // 8. 返回前 N 个
    return recommendations.slice(0, finalLimit);
  }

  /**
   * 获取用户的好友 ID 列表
   * @param userId 用户 ID
   * @returns 好友 ID 数组
   */
  private async getUserFriendIds(userId: string): Promise<string[]> {
    const friendships_ = await db
      .select({
        userId: friendships.userId,
        friendId: friendships.friendId,
      })
      .from(friendships)
      .where(
        and(
          or(eq(friendships.userId, userId), eq(friendships.friendId, userId)),
          eq(friendships.status, "accepted")
        )
      );

    const friendIds: string[] = [];
    for (const friendship of friendships_) {
      if (friendship.userId === userId) {
        friendIds.push(friendship.friendId);
      } else {
        friendIds.push(friendship.userId);
      }
    }

    return friendIds;
  }

  /**
   * 补充用户详细信息
   * @param userIds 用户 ID 数组
   * @returns 用户信息和标签
   */
  private async enrichUserInfo(
    userIds: string[]
  ): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      image: string | null;
      tags: string[];
    }>
  > {
    if (userIds.length === 0) {
      return [];
    }

    // 查询用户基本信息
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(user)
      .where(inArray(user.id, userIds));

    // 查询用户标签
    const tags = await db
      .select({
        userId: userTags.userId,
        tags: userTags.tags,
      })
      .from(userTags)
      .where(inArray(userTags.userId, userIds));

    // 合并信息
    const tagsMap = new Map<string, string[]>();
    for (const tag of tags) {
      tagsMap.set(tag.userId, tag.tags || []);
    }

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      tags: tagsMap.get(u.id) || [],
    }));
  }

  /**
   * 计算共同标签
   * @param tags1 用户1的标签
   * @param tags2 用户2的标签
   * @returns 共同标签数组
   */
  private calculateCommonTags(tags1: string[], tags2: string[]): string[] {
    const set1 = new Set(tags1);
    const commonTags: string[] = [];

    for (const tag of tags2) {
      if (set1.has(tag)) {
        commonTags.push(tag);
      }
    }

    return commonTags;
  }

  /**
   * 计算两个用户的相似度
   * @param userId1 用户1 ID
   * @param userId2 用户2 ID
   * @returns 相似度分数 (0-1)
   */
  async calculateSimilarity(
    userId1: string,
    userId2: string
  ): Promise<number> {
    const { userIds, scores } = await embeddingService.searchSimilar(
      userId1,
      50
    );

    const index = userIds.indexOf(userId2);
    if (index === -1) {
      return 0;
    }

    return scores[index];
  }
}

// 导出单例
export const recommendationService = new RecommendationService();
