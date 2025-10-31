import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@workspace/database";
import {
  user as userTable,
  friendships,
  groups,
  groupMembers,
  messages as messagesTable,
} from "@workspace/database";
import { eq, and, or, ilike } from "drizzle-orm";

export interface McpServerContext {
  userId: string;
}

export interface ToolHandlers {
  get_user_info: () => Promise<any>;
  get_user_friends: () => Promise<any>;
  get_user_groups: () => Promise<any>;
  search_messages: (args: { query: string; limit?: number }) => Promise<any>;
  query_context7_docs: (args: {
    libraryName: string;
    topic?: string;
    tokens?: number;
  }) => Promise<any>;
}

export function createMcpServer(context: McpServerContext): {
  server: McpServer;
  handlers: ToolHandlers;
} {
  const server = new McpServer({
    name: "web-chat-assistant",
    version: "1.0.0",
  });

  // 存储工具处理函数
  const handlers: Partial<ToolHandlers> = {};

  // Tool: 获取用户信息
  const getUserInfo = async () => {
    const [user] = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        image: userTable.image,
        code: userTable.code,
      })
      .from(userTable)
      .where(eq(userTable.id, context.userId))
      .limit(1);

    if (!user) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: "User not found" }),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(user) }],
      structuredContent: user,
    };
  };

  handlers.get_user_info = getUserInfo;

  server.registerTool(
    "get_user_info",
    {
      title: "Get User Information",
      description: "获取当前用户的详细信息，包括用户ID、姓名、邮箱等",
      inputSchema: {},
    },
    getUserInfo
  );

  // Tool: 获取用户好友列表
  const getUserFriends = async () => {
    const userFriends = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        image: userTable.image,
      })
      .from(friendships)
      .innerJoin(
        userTable,
        or(
          and(
            eq(friendships.userId, context.userId),
            eq(userTable.id, friendships.friendId)
          ),
          and(
            eq(friendships.friendId, context.userId),
            eq(userTable.id, friendships.userId)
          )
        )
      )
      .where(
        or(
          eq(friendships.userId, context.userId),
          eq(friendships.friendId, context.userId)
        )
      );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ friends: userFriends }),
        },
      ],
      structuredContent: { friends: userFriends },
    };
  };

  handlers.get_user_friends = getUserFriends;

  server.registerTool(
    "get_user_friends",
    {
      title: "Get User Friends",
      description: "获取当前用户的好友列表",
      inputSchema: {},
    },
    getUserFriends
  );

  // Tool: 获取用户群组列表
  const getUserGroups = async () => {
    const userGroups = await db
      .select({
        id: groups.id,
        name: groups.name,
        avatar: groups.avatar,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.userId, context.userId));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ groups: userGroups }),
        },
      ],
      structuredContent: { groups: userGroups },
    };
  };

  handlers.get_user_groups = getUserGroups;

  server.registerTool(
    "get_user_groups",
    {
      title: "Get User Groups",
      description: "获取当前用户加入的所有群组列表",
      inputSchema: {},
    },
    getUserGroups
  );

  // Tool: 搜索消息
  const searchMessages = async ({
    query,
    limit = 10,
  }: {
    query: string;
    limit?: number;
  }) => {
    const searchLimit = Math.min(limit || 10, 50); // 最多返回50条

    const userMessages = await db
      .select({
        id: messagesTable.id,
        content: messagesTable.content,
        senderId: messagesTable.senderId,
        recipientId: messagesTable.recipientId,
        groupId: messagesTable.groupId,
        createdAt: messagesTable.createdAt,
      })
      .from(messagesTable)
      .where(
        and(
          or(
            eq(messagesTable.senderId, context.userId),
            eq(messagesTable.recipientId, context.userId)
          ),
          ilike(messagesTable.content, `%${query}%`)
        )
      )
      .limit(searchLimit);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            messages: userMessages.map((msg) => ({
              ...msg,
              createdAt: msg.createdAt.toISOString(),
            })),
          }),
        },
      ],
      structuredContent: {
        messages: userMessages.map((msg) => ({
          ...msg,
          createdAt: msg.createdAt.toISOString(),
        })),
      },
    };
  };

  handlers.search_messages = searchMessages;

  server.registerTool(
    "search_messages",
    {
      title: "Search Messages",
      description: "在当前用户的消息中搜索关键词",
      inputSchema: {
        query: z.string().describe("搜索关键词"),
        limit: z.number().optional().describe("返回结果数量限制，默认10"),
      },
    },
    searchMessages
  );

  // Tool: 查询 Context7 文档（占位符，实际在 API 路由中处理）
  const queryContext7Docs = async ({
    libraryName,
    topic,
    tokens = 5000,
  }: {
    libraryName: string;
    topic?: string;
    tokens?: number;
  }) => {
    try {
      // 这里需要通过 MCP client 调用 Context7
      // 由于我们在 Express 中，需要使用 MCP client 连接
      // 暂时返回说明，实际需要在 API 路由中集成
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              documentation: `需要查询 ${libraryName} 的文档${
                topic ? `（主题：${topic}）` : ""
              }`,
              note: "Context7 查询将在 API 路由中通过 MCP client 调用",
            }),
          },
        ],
        structuredContent: {
          documentation: `需要查询 ${libraryName} 的文档`,
        },
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: error instanceof Error ? error.message : "Unknown error",
            }),
          },
        ],
        isError: true,
      };
    }
  };

  handlers.query_context7_docs = queryContext7Docs;

  server.registerTool(
    "query_context7_docs",
    {
      title: "Query Context7 Documentation",
      description: "使用 Context7 查询指定库的文档",
      inputSchema: {
        libraryName: z
          .string()
          .describe("要查询的库名称，例如 'react' 或 'vercel/ai'"),
        topic: z.string().optional().describe("要查询的主题，可选"),
        tokens: z.number().optional().describe("返回的最大token数，默认5000"),
      },
    },
    queryContext7Docs
  );

  return { server, handlers: handlers as ToolHandlers };
}
