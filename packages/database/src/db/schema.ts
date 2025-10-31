import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  varchar,
  integer,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  code: varchar("code", { length: 15 }).unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
// 聊天应用相关表
export const friendships = pgTable("friendship", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  friendId: text("friend_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending, accepted, blocked
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groups = pgTable("group", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  creatorId: text("creator_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMembers = pgTable("group_member", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // admin, member
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const messages = pgTable("message", {
  id: uuid("id").defaultRandom().primaryKey(),
  content: text("content").notNull(),
  senderId: text("sender_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  recipientId: text("recipient_id").references(() => user.id, {
    onDelete: "cascade",
  }), // 一对一消息
  groupId: uuid("group_id").references(() => groups.id, {
    onDelete: "cascade",
  }), // 群聊消息
  type: text("type").notNull().default("text"), // text, image, file
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const friendRequests = pgTable("friend_request", {
  id: uuid("id").defaultRandom().primaryKey(),
  fromUserId: text("from_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  toUserId: text("to_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  message: text("message"),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callRecords = pgTable("call_record", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: text("room_id").notNull(),
  callerId: text("caller_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  receiverId: text("receiver_id").references(() => user.id, {
    onDelete: "cascade",
  }), // 群组通话时可为 null
  groupId: uuid("group_id").references(() => groups.id, {
    onDelete: "cascade",
  }), // 群组通话时不为 null
  callType: text("call_type").notNull(), // 'video' | 'audio'
  status: text("status").notNull(), // 'completed' | 'missed' | 'rejected' | 'cancelled'
  duration: integer("duration").default(0).notNull(), // 通话时长（秒）
  startedAt: timestamp("started_at"), // 实际接通时间
  endedAt: timestamp("ended_at"), // 通话结束时间
  createdAt: timestamp("created_at").defaultNow().notNull(), // 请求发起时间
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// 未读消息计数表(用于离线消息计数)
export const unreadMessages = pgTable("unread_message", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }), // 接收者ID
  senderId: text("sender_id").references(() => user.id, {
    onDelete: "cascade",
  }), // 发送者ID(一对一聊天)
  groupId: uuid("group_id").references(() => groups.id, {
    onDelete: "cascade",
  }), // 群组ID(群聊)
  unreadCount: integer("unread_count").default(0).notNull(),
  lastMessageTime: timestamp("last_message_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// 用户标签表
export const userTags = pgTable("user_tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  tags: text("tags").array().notNull(), // 标签数组,最多8个
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type FriendRequest = typeof friendRequests.$inferSelect;
export type CallRecord = typeof callRecords.$inferSelect;
export type UnreadMessage = typeof unreadMessages.$inferSelect;
export type UserTag = typeof userTags.$inferSelect;
