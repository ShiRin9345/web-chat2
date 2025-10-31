import OpenAI from "openai";
import { ChromaClient, Collection } from "chromadb";
import { config } from "dotenv";
config({ path: "../../.env.local" });

/**
 * 向量化服务
 * 负责生成文本向量并存储到 ChromaDB
 */
class EmbeddingService {
  private openaiClient: OpenAI;
  private chromaClient: ChromaClient;
  private collection: Collection | null = null;
  private readonly collectionName = "user_tag_embeddings";

  constructor() {
    // 初始化 OpenAI 客户端 (通过 DashScope 兼容接口)
    this.openaiClient = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY || "",
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });

    // 初始化 ChromaDB 客户端
    this.chromaClient = new ChromaClient({
      path: process.env.CHROMA_URL || "http://localhost:8000",
    });
  }

  /**
   * 初始化 ChromaDB Collection
   * 应用启动时调用一次
   */
  async initialize(): Promise<void> {
    try {
      this.collection = await this.chromaClient.getOrCreateCollection({
        name: this.collectionName,
        metadata: { "hnsw:space": "cosine" }, // 使用余弦相似度
      });
      console.log(`ChromaDB collection "${this.collectionName}" 已初始化`);
    } catch (error) {
      console.error("ChromaDB 初始化失败:", error);
      throw error;
    }
  }

  /**
   * 生成文本向量
   * @param text 要向量化的文本
   * @returns 1024 维向量
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openaiClient.embeddings.create({
        model: "text-embedding-v4",
        input: [text],
        dimensions: 1024,
        encoding_format: "float",
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("向量生成失败:", error);
      throw new Error("Failed to generate embedding");
    }
  }

  /**
   * 更新或插入用户向量
   * @param userId 用户 ID
   * @param tags 用户标签数组
   * @returns 是否成功
   */
  async upsertUserVector(userId: string, tags: string[]): Promise<boolean> {
    if (!this.collection) {
      throw new Error("Collection not initialized");
    }

    try {
      // 构造文本: "我喜欢篮球、编程、摄影"
      const text = `我喜欢${tags.join("、")}`;

      // 生成向量
      const vector = await this.generateEmbedding(text);

      // 存储到 ChromaDB
      await this.collection.upsert({
        ids: [userId],
        embeddings: [vector],
        documents: [text], // 存储原始文本
        metadatas: [
          {
            user_id: userId,
            tags: JSON.stringify(tags), // 将数组转为JSON字符串
            tag_count: tags.length,
            updated_at: new Date().toISOString(),
          },
        ],
      });

      console.log(`用户 ${userId} 的向量已更新`);
      return true;
    } catch (error) {
      console.error(`用户 ${userId} 向量更新失败:`, error);
      throw error;
    }
  }

  /**
   * 删除用户向量
   * @param userId 用户 ID
   */
  async deleteUserVector(userId: string): Promise<void> {
    if (!this.collection) {
      throw new Error("Collection not initialized");
    }

    try {
      await this.collection.delete({
        ids: [userId],
      });
      console.log(`用户 ${userId} 的向量已删除`);
    } catch (error) {
      console.error(`删除用户 ${userId} 向量失败:`, error);
      throw error;
    }
  }

  /**
   * 搜索相似用户
   * @param userId 当前用户 ID
   * @param topK 返回前 K 个结果 (默认 20)
   * @returns 相似用户 ID 列表和相似度分数
   */
  async searchSimilar(
    userId: string,
    topK: number = 20
  ): Promise<{ userIds: string[]; scores: number[] }> {
    if (!this.collection) {
      throw new Error("Collection not initialized");
    }

    try {
      // 获取用户向量
      const userDoc = await this.collection.get({
        ids: [userId],
        include: ["embeddings" as any],
      });

      if (!userDoc.embeddings || userDoc.embeddings.length === 0) {
        console.log(`用户 ${userId} 没有向量数据`);
        return { userIds: [], scores: [] };
      }

      // 相似度搜索
      const results = await this.collection.query({
        queryEmbeddings: [userDoc.embeddings[0] as number[]],
        nResults: topK + 1, // +1 因为结果包含自己
        include: ["metadatas" as any, "distances" as any],
      });

      // 过滤掉自己,转换距离为相似度
      const userIds: string[] = [];
      const scores: number[] = [];

      if (
        results.ids &&
        results.ids[0] &&
        results.distances &&
        results.distances[0]
      ) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const id = results.ids[0][i];
          if (id !== userId) {
            userIds.push(id);
            // 余弦距离转相似度: similarity = 1 - distance
            scores.push(1 - (results.distances[0][i] || 0));
          }
        }
      }

      return { userIds: userIds.slice(0, topK), scores: scores.slice(0, topK) };
    } catch (error) {
      console.error(`搜索用户 ${userId} 的相似用户失败:`, error);
      throw error;
    }
  }

  /**
   * 获取 Collection 统计信息
   */
  async getStats(): Promise<{ count: number }> {
    if (!this.collection) {
      throw new Error("Collection not initialized");
    }

    try {
      const count = await this.collection.count();
      return { count };
    } catch (error) {
      console.error("获取统计信息失败:", error);
      throw error;
    }
  }
}

// 导出单例
export const embeddingService = new EmbeddingService();
