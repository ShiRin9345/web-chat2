import { db } from "./index.js";
import { predefinedTags } from "./schema.js";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// 加载环境变量 - 从项目根目录加载 .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// 尝试从多个可能的位置加载环境变量
const envPaths = [
  resolve(__dirname, "../../../.env.local"), // 项目根目录
  resolve(__dirname, "../../.env.local"), // packages/database 目录
];
for (const envPath of envPaths) {
  config({ path: envPath });
}

const tagCategories = [
  {
    category: "sports",
    displayCategory: "运动健身",
    tags: [
      { name: "basketball", displayName: "篮球" },
      { name: "football", displayName: "足球" },
      { name: "running", displayName: "跑步" },
      { name: "swimming", displayName: "游泳" },
      { name: "yoga", displayName: "瑜伽" },
      { name: "fitness", displayName: "健身" },
      { name: "badminton", displayName: "羽毛球" },
      { name: "tennis", displayName: "网球" },
      { name: "cycling", displayName: "骑行" },
      { name: "climbing", displayName: "攀岩" },
    ],
  },
  {
    category: "music",
    displayCategory: "音乐艺术",
    tags: [
      { name: "pop", displayName: "流行音乐" },
      { name: "rock", displayName: "摇滚" },
      { name: "jazz", displayName: "爵士" },
      { name: "classical", displayName: "古典音乐" },
      { name: "hiphop", displayName: "嘻哈" },
      { name: "guitar", displayName: "吉他" },
      { name: "piano", displayName: "钢琴" },
      { name: "singing", displayName: "唱歌" },
      { name: "painting", displayName: "绘画" },
      { name: "photography", displayName: "摄影" },
    ],
  },
  {
    category: "technology",
    displayCategory: "科技编程",
    tags: [
      { name: "programming", displayName: "编程" },
      { name: "frontend", displayName: "前端开发" },
      { name: "backend", displayName: "后端开发" },
      { name: "ai", displayName: "人工智能" },
      { name: "blockchain", displayName: "区块链" },
      { name: "mobile", displayName: "移动开发" },
      { name: "cloud", displayName: "云计算" },
      { name: "security", displayName: "网络安全" },
      { name: "data", displayName: "数据科学" },
      { name: "hardware", displayName: "硬件DIY" },
    ],
  },
  {
    category: "reading",
    displayCategory: "阅读写作",
    tags: [
      { name: "fiction", displayName: "小说" },
      { name: "nonfiction", displayName: "非虚构" },
      { name: "history", displayName: "历史" },
      { name: "philosophy", displayName: "哲学" },
      { name: "poetry", displayName: "诗歌" },
      { name: "biography", displayName: "传记" },
      { name: "writing", displayName: "写作" },
      { name: "blogging", displayName: "博客" },
      { name: "journalism", displayName: "新闻" },
      { name: "literature", displayName: "文学" },
    ],
  },
  {
    category: "travel",
    displayCategory: "旅行探索",
    tags: [
      { name: "backpacking", displayName: "背包旅行" },
      { name: "hiking", displayName: "徒步" },
      { name: "camping", displayName: "露营" },
      { name: "photography", displayName: "旅拍" },
      { name: "foodie", displayName: "美食探索" },
      { name: "culture", displayName: "文化体验" },
      { name: "adventure", displayName: "探险" },
      { name: "beach", displayName: "海滩" },
      { name: "mountain", displayName: "登山" },
      { name: "citytrip", displayName: "城市游" },
    ],
  },
  {
    category: "food",
    displayCategory: "美食烹饪",
    tags: [
      { name: "cooking", displayName: "烹饪" },
      { name: "baking", displayName: "烘焙" },
      { name: "chinese", displayName: "中餐" },
      { name: "western", displayName: "西餐" },
      { name: "japanese", displayName: "日料" },
      { name: "coffee", displayName: "咖啡" },
      { name: "tea", displayName: "茶艺" },
      { name: "dessert", displayName: "甜品" },
      { name: "vegan", displayName: "素食" },
      { name: "wine", displayName: "品酒" },
    ],
  },
  {
    category: "gaming",
    displayCategory: "游戏电竞",
    tags: [
      { name: "moba", displayName: "MOBA游戏" },
      { name: "fps", displayName: "FPS射击" },
      { name: "rpg", displayName: "角色扮演" },
      { name: "strategy", displayName: "策略游戏" },
      { name: "boardgame", displayName: "桌游" },
      { name: "esports", displayName: "电竞" },
      { name: "mobile_game", displayName: "手游" },
      { name: "console", displayName: "主机游戏" },
      { name: "indie", displayName: "独立游戏" },
      { name: "retro", displayName: "复古游戏" },
    ],
  },
  {
    category: "lifestyle",
    displayCategory: "生活方式",
    tags: [
      { name: "meditation", displayName: "冥想" },
      { name: "minimalism", displayName: "极简主义" },
      { name: "fashion", displayName: "时尚" },
      { name: "beauty", displayName: "美妆" },
      { name: "pets", displayName: "宠物" },
      { name: "gardening", displayName: "园艺" },
      { name: "diy", displayName: "手工DIY" },
      { name: "volunteer", displayName: "志愿服务" },
      { name: "anime", displayName: "动漫" },
      { name: "movies", displayName: "电影" },
    ],
  },
];

async function seedTags() {
  console.log("开始插入预定义标签...");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL 环境变量未设置");
  }

  try {
    let insertedCount = 0;
    let skippedCount = 0;

    // 批量插入标签，使用 ON CONFLICT 处理重复
    for (const categoryData of tagCategories) {
      for (const tag of categoryData.tags) {
        try {
          await db
            .insert(predefinedTags)
            .values({
              category: categoryData.category,
              name: tag.name,
              displayName: tag.displayName,
              description: `${categoryData.displayCategory} - ${tag.displayName}`,
              usageCount: 0,
            })
            .onConflictDoUpdate({
              target: predefinedTags.name,
              set: {
                displayName: tag.displayName,
                description: `${categoryData.displayCategory} - ${tag.displayName}`,
              },
            });
          insertedCount++;
        } catch (error: any) {
          // 如果是唯一约束冲突，跳过
          if (error.code === "23505" || error.message?.includes("unique")) {
            skippedCount++;
            console.log(`跳过已存在的标签: ${tag.name}`);
          } else {
            throw error;
          }
        }
      }
    }

    const totalTags = tagCategories.reduce(
      (sum, cat) => sum + cat.tags.length,
      0
    );
    console.log(
      `成功插入 ${insertedCount} 个预定义标签，跳过 ${skippedCount} 个已存在的标签（总计 ${totalTags} 个）`
    );
  } catch (error) {
    console.error("插入标签失败:", error);
    throw error;
  }
}

// 运行脚本
seedTags()
  .then(() => {
    console.log("种子数据插入完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("种子数据插入失败:", error);
    process.exit(1);
  });
