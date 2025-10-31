import { db } from "@workspace/database";
import { callRecords, friendships } from "@workspace/database";
import { eq, and, or } from "drizzle-orm";

export interface CreateCallRecordParams {
  roomId: string;
  callerId: string;
  receiverId: string;
  callType: "video" | "audio";
}

export interface UpdateCallRecordParams {
  recordId: string;
  status?: "completed" | "missed" | "rejected" | "cancelled";
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
}

/**
 * 创建通话记录
 */
export async function createCallRecord(params: CreateCallRecordParams) {
  const { roomId, callerId, receiverId, callType } = params;

  const [record] = await db
    .insert(callRecords)
    .values({
      roomId,
      callerId,
      receiverId,
      callType,
      status: "pending",
      duration: 0,
    })
    .returning();

  return record;
}

/**
 * 更新通话记录
 */
export async function updateCallRecord(params: UpdateCallRecordParams) {
  const { recordId, ...updateData } = params;

  const [record] = await db
    .update(callRecords)
    .set(updateData)
    .where(eq(callRecords.id, recordId))
    .returning();

  return record;
}

/**
 * 验证好友关系
 */
export async function validateFriendship(
  userId: string,
  friendId: string
): Promise<boolean> {
  const friendship = await db
    .select()
    .from(friendships)
    .where(
      and(
        or(
          and(
            eq(friendships.userId, userId),
            eq(friendships.friendId, friendId)
          ),
          and(
            eq(friendships.userId, friendId),
            eq(friendships.friendId, userId)
          )
        ),
        eq(friendships.status, "accepted")
      )
    )
    .limit(1);

  return friendship.length > 0;
}

/**
 * 查询通话历史
 */
export async function getCallHistory(userId: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const records = await db
    .select()
    .from(callRecords)
    .where(
      or(eq(callRecords.callerId, userId), eq(callRecords.receiverId, userId))
    )
    .orderBy(callRecords.createdAt)
    .limit(limit)
    .offset(offset);

  return records;
}
