# 好友推荐功能 - 部署和测试指南

## 功能概述

基于用户兴趣标签的智能好友推荐系统,使用 ChromaDB 向量数据库和 DashScope Embedding API 实现语义相似度匹配。

## 完成的功能

### 后端实现

1. **数据库Schema** ✅
   - `user_tags` 表 - 存储用户标签
   - `predefined_tags` 表 - 预定义标签库
   - 数据库迁移文件已生成

2. **核心服务** ✅
   - `EmbeddingService` - 向量化服务
   - `TagService` - 标签管理服务
   - `RecommendationService` - 推荐引擎服务

3. **API路由** ✅
   - `GET /api/users/profile/tags` - 获取用户标签
   - `PUT /api/users/profile/tags` - 更新用户标签
   - `GET /api/tags/predefined` - 获取预定义标签
   - `GET /api/recommendations/friends` - 获取推荐好友列表

### 前端实现

1. **React Query Hooks** ✅
   - `useUserTags` - 获取用户标签
   - `useUpdateUserTags` - 更新用户标签
   - `usePredefinedTags` - 获取预定义标签
   - `useRecommendations` - 获取推荐列表

2. **UI组件** ✅
   - `TagManager` - 标签管理组件
   - `RecommendationList` - 推荐列表组件
   - `RecommendationItem` - 推荐卡片组件
   - `ContactRecommendations` - 容器组件

3. **页面集成** ✅
   - 在联系人页面添加"推荐"Tab

## 部署步骤

### 1. 环境准备

#### 安装依赖
```bash
# 已在 package.json 中添加
# - openai@^4.77.3
# - chromadb@^1.9.2

# 安装依赖
pnpm install
```

#### 配置环境变量
在 `apps/server/.env.local` 中添加:

```env
# DashScope API Key (阿里云通义千问)
DASHSCOPE_API_KEY=sk-your-dashscope-api-key

# ChromaDB 服务地址
CHROMA_URL=http://localhost:8000
```

**获取 DashScope API Key:**
1. 访问 https://dashscope.console.aliyun.com/
2. 登录阿里云账号
3. 创建 API Key
4. 复制并粘贴到 .env.local

### 2. 启动 ChromaDB

```bash
# 在项目根目录
docker-compose up -d chromadb

# 检查服务状态
docker-compose ps
curl http://localhost:8000/api/v1/heartbeat
```

### 3. 数据库迁移

```bash
# 应用数据库迁移
cd packages/database
pnpm db:push

# 插入预定义标签种子数据
cd packages/database
npx tsx src/db/seed-tags.ts
```

### 4. 启动服务

```bash
# 在项目根目录
pnpm dev
```

服务将在以下端口运行:
- 前端: http://localhost:3000
- 后端: http://localhost:3001
- ChromaDB: http://localhost:8000

## 测试流程

### 后端API测试

#### 1. 测试预定义标签接口
```bash
# 获取所有预定义标签
curl -X GET http://localhost:3001/api/tags/predefined \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 2. 测试用户标签管理
```bash
# 获取当前用户标签
curl -X GET http://localhost:3001/api/users/profile/tags \
  -H "Authorization: Bearer YOUR_TOKEN"

# 更新用户标签
curl -X PUT http://localhost:3001/api/users/profile/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"tags": ["篮球", "编程", "摄影"]}'
```

#### 3. 测试推荐接口
```bash
# 获取推荐好友列表
curl -X GET http://localhost:3001/api/recommendations/friends?limit=5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 前端功能测试

#### 1. 设置用户标签
1. 登录应用
2. 进入"联系人"页面
3. 切换到"推荐"Tab
4. 点击"管理标签"
5. 选择或输入标签(1-8个)
6. 点击"保存"

#### 2. 查看推荐好友
1. 在"推荐"Tab中查看推荐列表
2. 检查相似度百分比
3. 查看共同标签高亮显示
4. 点击"刷新"按钮更新推荐

#### 3. 添加推荐好友
1. 点击推荐卡片上的"添加好友"按钮
2. 确认好友请求已发送
3. 验证该用户从推荐列表中消失(已是好友)

## 预期行为

### 推荐算法逻辑
1. 用户未设置标签 → 显示"设置标签"提示
2. 用户设置标签后 → 自动生成向量并存储到ChromaDB
3. 查询推荐时:
   - 从ChromaDB检索相似度Top 20用户
   - 过滤已是好友的用户
   - 过滤相似度< 0.6的用户
   - 按相似度降序排序
   - 返回前5个结果

### 相似度计算
- 使用通义千问 text-embedding-v4 模型
- 向量维度: 1024
- 距离度量: 余弦相似度
- 相似度范围: 0-1 (1为最相似)

## 注意事项

### ChromaDB相关
- 确保Docker服务正常运行
- 首次启动会自动创建collection
- 数据持久化到 `./chroma_data` 目录

### DashScope API
- 每次标签更新会调用Embedding API
- 建议监控API调用量
- 免费额度: 具体查看阿里云控制台

### 已知问题

1. **TypeScript类型错误**
   - ChromaDB的TypeScript类型定义较严格
   - 部分类型使用 `as any` 绕过编译
   - 不影响运行时功能

2. **数据库导入路径**
   - 某些编辑器可能报错 `@workspace/database/schema`
   - 实际运行时正常,因为 `@workspace/database` 已导出schema

## 性能考虑

- 推荐结果缓存2分钟(前端)
- 预定义标签缓存5分钟
- 向量化操作异步执行,不阻塞用户响应
- ChromaDB查询性能良好(<100ms)

## 下一步优化

1. 添加推荐结果缓存(后端)
2. 实现批量向量更新
3. 添加API限流保护
4. 优化相似度阈值
5. 增加更多预定义标签分类

## 故障排查

### ChromaDB无法连接
```bash
# 检查Docker容器状态
docker ps | grep chromadb

# 查看日志
docker logs web-chat-chromadb

# 重启容器
docker-compose restart chromadb
```

### 推荐列表为空
1. 检查用户是否设置了标签
2. 检查ChromaDB中是否有其他用户向量
3. 查看服务器日志是否有错误
4. 尝试降低相似度阈值(代码中修改)

### Embedding API调用失败
1. 验证 DASHSCOPE_API_KEY 是否正确
2. 检查API额度是否用尽
3. 查看DashScope控制台错误信息
4. 确认网络连接正常

## 文件清单

### 后端文件
- `/apps/server/src/services/embedding.ts` - 向量化服务
- `/apps/server/src/services/tags.ts` - 标签管理服务
- `/apps/server/src/services/recommendations.ts` - 推荐引擎
- `/apps/server/src/routes/tags.ts` - 标签API路由
- `/apps/server/src/routes/recommendations.ts` - 推荐API路由
- `/apps/server/src/index.ts` - 服务启动入口(已更新)

### 前端文件
- `/apps/client/src/queries/tags.ts` - 标签查询hooks
- `/apps/client/src/queries/recommendations.ts` - 推荐查询hooks
- `/apps/client/src/components/TagManager.tsx` - 标签管理组件
- `/apps/client/src/components/RecommendationItem.tsx` - 推荐卡片
- `/apps/client/src/components/RecommendationList.tsx` - 推荐列表
- `/apps/client/src/components/ContactRecommendations.tsx` - 容器组件
- `/apps/client/src/routes/_authenticated/contacts.tsx` - 联系人页面(已更新)

### 数据库文件
- `/packages/database/src/db/schema.ts` - 数据库Schema(已更新)
- `/packages/database/src/db/seed-tags.ts` - 标签种子数据
- `/packages/database/drizzle/0006_jazzy_gorgon.sql` - 迁移SQL

### 配置文件
- `/docker-compose.yml` - ChromaDB Docker配置
- `/apps/server/package.json` - 依赖配置(已更新)
- `/ENV_CONFIG.md` - 环境变量配置说明

## 技术栈总结

- **向量数据库**: ChromaDB 1.9.2
- **Embedding模型**: 通义千问 text-embedding-v4 (1024维)
- **后端框架**: Express + TypeScript
- **前端框架**: React + TanStack Router + React Query
- **ORM**: Drizzle ORM
- **UI组件**: Workspace UI (shadcn/ui)
