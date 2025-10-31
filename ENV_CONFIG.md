# ChromaDB 和 DashScope 环境变量配置

## 必需环境变量

在 apps/server/.env.local 文件中添加以下配置:

```env
# DashScope API (通义千问 Embedding)
DASHSCOPE_API_KEY=sk-your-api-key-here

# ChromaDB 服务地址
CHROMA_URL=http://localhost:8000
```

## 获取 DashScope API Key

1. 访问阿里云 DashScope 控制台: https://dashscope.console.aliyun.com/
2. 登录并创建 API Key
3. 复制 API Key 并替换上面的 `sk-your-api-key-here`

## 启动 ChromaDB

在项目根目录运行:

```bash
docker-compose up -d chromadb
```

检查服务状态:

```bash
docker-compose ps
curl http://localhost:8000/api/v1/heartbeat
```
