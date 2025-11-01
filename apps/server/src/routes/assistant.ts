import { Router } from "express";
import { streamText, convertToModelMessages, tool, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { authenticateUser } from "@/middleware/auth";
import { createMcpServer } from "@/services/mcpServer";
import type { Request, Response } from "express";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";
import { config } from "dotenv";
import { db } from "@workspace/database";
import { assistantMessages } from "@workspace/database";
import { eq, desc, lt, and } from "drizzle-orm";

config({ path: "../../.env.local" });

export const assistantRouter = Router();

// 配置 qwen model (使用 OpenAI 兼容模式)
let model: any;

try {
  // 使用 OpenAI provider 通过 DashScope 兼容接口访问 Qwen
  const qwenProvider = createOpenAI({
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey: process.env.DASHSCOPE_API_KEY || "",
  });

  // 使用 Chat Completions API (DashScope 兼容模式不支持 Responses API)
  // 使用 qwen-plus 模型
  model = qwenProvider.chat("qwen-plus");
} catch (error) {
  console.error("Failed to initialize Qwen model:", error);
  throw error;
}

// Context7 MCP Client (如果可用)
let context7Client: Client | null = null;

// 尝试连接到 Context7 MCP server（如果配置了）
if (process.env.CONTEXT7_MCP_COMMAND) {
  try {
    const [command, ...args] = process.env.CONTEXT7_MCP_COMMAND.split(" ");
    const transport = new StdioClientTransport({
      command,
      args,
    });

    context7Client = new Client({
      name: "web-chat-assistant",
      version: "1.0.0",
    });

    context7Client.connect(transport).catch((error) => {
      console.warn("Failed to connect to Context7 MCP server:", error);
      context7Client = null;
    });
  } catch (error) {
    console.warn("Context7 MCP server not configured:", error);
  }
}

// Helper function to query Context7 via MCP
async function queryContext7Docs(
  libraryName: string,
  topic?: string,
  tokens = 5000
): Promise<string> {
  if (!context7Client) {
    return `Context7 MCP server 未配置。请设置 CONTEXT7_MCP_COMMAND 环境变量。`;
  }

  try {
    // 先解析 library ID
    const resolveResult = await context7Client.callTool({
      name: "resolve-library-id",
      arguments: {
        libraryName,
      },
    });

    const libraryId =
      typeof resolveResult.structuredContent === "object" &&
      resolveResult.structuredContent !== null &&
      "libraryId" in resolveResult.structuredContent
        ? (resolveResult.structuredContent as { libraryId: string }).libraryId
        : null;

    if (!libraryId) {
      return `未找到库: ${libraryName}`;
    }

    // 查询文档
    const docsResult = await context7Client.callTool({
      name: "get-library-docs",
      arguments: {
        context7CompatibleLibraryID: libraryId,
        topic,
        tokens,
      },
    });

    const firstContent =
      Array.isArray(docsResult.content) && docsResult.content.length > 0
        ? docsResult.content[0]
        : null;

    return firstContent &&
      typeof firstContent === "object" &&
      "text" in firstContent
      ? (firstContent as { text: string }).text
      : JSON.stringify(docsResult.structuredContent);
  } catch (error) {
    return `查询 Context7 文档时出错: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
}

// POST /api/assistant/chat
assistantRouter.post(
  "/chat",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "未授权" });
      }

      const { messages } = req.body;

      // 保存用户发送的最新消息
      const userMessages = messages.filter((msg: any) => msg.role === "user");
      const lastUserMessage = userMessages[userMessages.length - 1];
      let userMessageId: string | null = null;

      // 从消息中提取文本内容（可能是 content 字段或 parts 数组）
      let userMessageContent: string | null = null;
      if (lastUserMessage) {
        if (lastUserMessage.content) {
          userMessageContent = lastUserMessage.content;
        } else if (
          lastUserMessage.parts &&
          Array.isArray(lastUserMessage.parts)
        ) {
          // 从 parts 数组中提取文本
          const textPart = lastUserMessage.parts.find(
            (part: any) => part.type === "text"
          );
          if (textPart?.text) {
            userMessageContent = textPart.text;
          }
        }
      }

      if (userMessageContent) {
        try {
          console.log("保存用户消息:", userMessageContent);
          const [savedMessage] = await db
            .insert(assistantMessages)
            .values({
              userId,
              role: "user",
              content: userMessageContent,
            })
            .returning({ id: assistantMessages.id });
          userMessageId = savedMessage.id;
          console.log("用户消息保存成功，ID:", userMessageId);
        } catch (error) {
          console.error("保存用户消息失败:", error);
          // 继续执行，不阻塞聊天功能
        }
      } else {
        console.log("没有找到用户消息内容");
      }

      // 创建 MCP server 并获取工具处理函数
      const { handlers } = createMcpServer({ userId });

      // 创建工具定义
      const tools = {
        get_user_info: tool({
          description: "获取当前用户的详细信息，包括用户ID、姓名、邮箱等",
          inputSchema: z.object({}),
          execute: async () => {
            const result = await handlers.get_user_info();
            if (result.isError || !result.structuredContent) {
              throw new Error("Failed to get user info");
            }
            return result.structuredContent as {
              id: string;
              name: string | null;
              email: string;
              image: string | null;
              code: string;
            };
          },
        }),

        get_user_friends: tool({
          description: "获取当前用户的好友列表",
          inputSchema: z.object({}),
          execute: async () => {
            const result = await handlers.get_user_friends();
            if (result.isError || !result.structuredContent) {
              throw new Error("Failed to get user friends");
            }
            return result.structuredContent as {
              friends: Array<{
                id: string;
                name: string | null;
                email: string;
                image: string | null;
              }>;
            };
          },
        }),

        get_user_groups: tool({
          description: "获取当前用户加入的所有群组列表",
          inputSchema: z.object({}),
          execute: async () => {
            const result = await handlers.get_user_groups();
            if (result.isError || !result.structuredContent) {
              throw new Error("Failed to get user groups");
            }
            return result.structuredContent as {
              groups: Array<{
                id: string;
                name: string;
                avatar: string | null;
              }>;
            };
          },
        }),

        search_messages: tool({
          description: "在当前用户的消息中搜索关键词",
          inputSchema: z.object({
            query: z.string().describe("搜索关键词"),
            limit: z.number().optional().describe("返回结果数量限制，默认10"),
          }),
          execute: async ({ query, limit }) => {
            const result = await handlers.search_messages({ query, limit });
            if (result.isError || !result.structuredContent) {
              throw new Error("Failed to search messages");
            }
            return result.structuredContent as {
              messages: Array<{
                id: string;
                content: string;
                senderId: string;
                recipientId: string | null;
                groupId: string | null;
                createdAt: string;
              }>;
            };
          },
        }),

        query_context7_docs: tool({
          description: "使用 Context7 查询指定库的文档",
          inputSchema: z.object({
            libraryName: z.string().describe("要查询的库名称"),
            topic: z.string().optional().describe("要查询的主题，可选"),
            tokens: z
              .number()
              .optional()
              .describe("返回的最大token数，默认5000"),
          }),
          execute: async ({ libraryName, topic, tokens }) => {
            const docs = await queryContext7Docs(libraryName, topic, tokens);
            return { documentation: docs };
          },
        }),
      };

      // 流式生成响应
      const result = streamText({
        model,
        system: `你是一个智能助手，可以帮助用户查询他们的信息、好友列表、群组、消息等。
你可以使用以下工具：
- get_user_info: 获取当前用户信息
- get_user_friends: 获取用户好友列表
- get_user_groups: 获取用户群组列表
- search_messages: 搜索用户消息
- query_context7_docs: 查询技术文档（通过 Context7）

请用中文回答用户的问题。`,
        messages: convertToModelMessages(messages),
        tools,
        stopWhen: stepCountIs(5),
        onFinish: async ({ text, toolCalls, finishReason }) => {
          // 保存助手响应到数据库
          try {
            console.log("保存助手消息，文本长度:", text?.length || 0);
            // 收集工具调用信息（如果有）
            let toolCallsJson: string | null = null;
            if (toolCalls && toolCalls.length > 0) {
              toolCallsJson = JSON.stringify(toolCalls);
              console.log("工具调用数量:", toolCalls.length);
            }

            const [savedMessage] = await db
              .insert(assistantMessages)
              .values({
                userId,
                role: "assistant",
                content: text || "",
                toolCalls: toolCallsJson,
              })
              .returning({ id: assistantMessages.id });
            console.log("助手消息保存成功，ID:", savedMessage.id);
          } catch (error) {
            console.error("保存助手消息失败:", error);
            // 继续执行，不阻塞聊天功能
          }
        },
      });

      // 在 Express 中使用 pipeUIMessageStreamToResponse 而不是 toUIMessageStreamResponse
      result.pipeUIMessageStreamToResponse(res);
      return;
    } catch (error) {
      console.error("Assistant chat error:", error);
      return res.status(500).json({
        error: "处理请求时出错",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// GET /api/assistant/history - 获取历史聊天记录
assistantRouter.get(
  "/history",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "未授权" });
      }

      const { limit = "50", cursor } = req.query;
      const pageLimit = Number.parseInt(limit as string, 10);
      if (Number.isNaN(pageLimit) || pageLimit > 100) {
        return res
          .status(400)
          .json({ error: "limit 参数无效或超过最大值 100" });
      }

      // 构建查询条件
      let whereCondition = eq(assistantMessages.userId, userId);
      if (cursor) {
        const cursorDate = new Date(cursor as string);
        whereCondition = and(
          eq(assistantMessages.userId, userId),
          lt(assistantMessages.createdAt, cursorDate)
        )!;
      }

      // 查询消息，按时间降序（最新的在前）
      const messagesList = await db
        .select()
        .from(assistantMessages)
        .where(whereCondition!)
        .orderBy(desc(assistantMessages.createdAt))
        .limit(pageLimit + 1); // 多查询一条用于判断是否还有更多

      console.log(`查询到 ${messagesList.length} 条消息，用户ID: ${userId}`);

      const hasMore = messagesList.length > pageLimit;
      const messages = hasMore
        ? messagesList.slice(0, pageLimit)
        : messagesList;

      // 计算下一页游标（使用最后一条消息的时间戳）
      const nextCursor =
        hasMore && messages.length > 0
          ? messages[messages.length - 1].createdAt.toISOString()
          : null;

      // 转换消息格式为前端需要的格式
      const formattedMessages = messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        toolCalls: msg.toolCalls ? JSON.parse(msg.toolCalls) : null,
        createdAt: msg.createdAt.toISOString(),
      }));

      res.json({
        messages: formattedMessages,
        nextCursor,
        hasMore,
      });
    } catch (error) {
      console.error("获取历史记录失败:", error);
      res.status(500).json({ error: "获取历史记录失败" });
    }
  }
);
