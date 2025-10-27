import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@workspace/ui/components/resizable";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Plus, Loader2, MessageSquare, Search } from "lucide-react";
import { useFriends } from "@/queries/friends";
import { useGroups } from "@/queries/groups";
import { useConversations } from "@/queries/messages";
import { useDialogStore } from "@/stores/dialog";
import { OnlineStatusIndicator } from "@/components/OnlineStatusIndicator";
import { useSocket } from "@/providers/SocketProvider";
import { useQueryClient } from "@tanstack/react-query";
import type { MessageWithSender } from "@/queries/messages";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesLayout,
});

function MessagesLayout() {
  const { openDialog } = useDialogStore();
  const { data: friends, isLoading: isLoadingFriends } = useFriends();
  const { data: groups, isLoading: isLoadingGroups } = useGroups();
  const { data: conversationsData, isLoading: isLoadingConversations } =
    useConversations();
  const [searchQuery, setSearchQuery] = useState("");
  const socket = useSocket();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id || "";

  // 监听 WebSocket 新消息，自动刷新会话列表
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: MessageWithSender) => {
      // 乐观更新：直接更新缓存中的会话列表
      queryClient.setQueryData<{ pages: any[]; pageParams: unknown[] }>(
        ["conversations"],
        (oldData) => {
          if (!oldData || !oldData.pages || !oldData.pages[0]) {
            return oldData;
          }

          // 确定会话 ID
          let conversationId: string;
          if (message.groupId) {
            conversationId = `group-${message.groupId}`;
          } else {
            // 一对一聊天，使用对方的 ID
            const otherUserId =
              message.senderId === currentUserId
                ? message.recipientId
                : message.senderId;
            conversationId = `friend-${otherUserId}`;
          }

          // 查找或创建会话信息
          const conversations = [...oldData.pages[0]];
          const existingIndex = conversations.findIndex(
            (conv) => conv.conversationId === conversationId
          );

          const newConvInfo = {
            conversationId,
            lastMessage: message.content,
            lastMessageTime: message.createdAt,
            lastMessageType: message.type,
            unreadCount: 0,
          };

          // 格式化显示内容
          let displayMessage = message.content;
          if (message.type === "image") {
            displayMessage = "[图片]";
          } else if (message.type === "file") {
            displayMessage = "[文件]";
          }
          newConvInfo.lastMessage = displayMessage;

          if (existingIndex >= 0) {
            // 更新已存在的会话，移到最前面
            conversations.splice(existingIndex, 1);
            conversations.unshift(newConvInfo);
          } else {
            // 新会话，添加到最前面
            conversations.unshift(newConvInfo);
          }

          return {
            ...oldData,
            pages: [conversations, ...oldData.pages.slice(1)],
          };
        }
      );
    };

    socket.on("message:new", handleNewMessage);

    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [socket, queryClient, currentUserId]);

  // 获取最新消息数据（第一页）
  const conversationsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        lastMessage: string;
        time: string;
        unreadCount: number;
        messageType: string;
      }
    >();

    if (conversationsData?.pages?.[0]) {
      for (const conv of conversationsData.pages[0]) {
        const timeAgo = formatTimeAgo(new Date(conv.lastMessageTime));

        // 根据消息类型格式化显示内容
        let displayMessage = conv.lastMessage;
        if (conv.lastMessageType === "image") {
          displayMessage = "[图片]";
        } else if (conv.lastMessageType === "file") {
          displayMessage = "[文件]";
        }

        map.set(conv.conversationId, {
          lastMessage: displayMessage,
          time: timeAgo,
          unreadCount: conv.unreadCount,
          messageType: conv.lastMessageType,
        });
      }
    }

    return map;
  }, [conversationsData]);

  // 合并好友和群聊作为会话列表
  const conversations = useMemo(() => {
    const list = [
      ...(friends || []).map((friend) => {
        const convId = `friend-${friend.id}`;
        const convInfo = conversationsMap.get(convId);
        return {
          id: convId,
          name: friend.name,
          avatar: friend.image,
          type: "friend" as const,
          lastMessage: convInfo?.lastMessage || "开始聊天吧",
          time: convInfo?.time || "",
          unreadCount: convInfo?.unreadCount || 0,
        };
      }),
      ...(groups || []).map((group) => {
        const convId = `group-${group.id}`;
        const convInfo = conversationsMap.get(convId);
        return {
          id: convId,
          name: group.name,
          avatar: group.avatar,
          type: "group" as const,
          lastMessage: convInfo?.lastMessage || "开始聊天吧",
          time: convInfo?.time || "",
          unreadCount: convInfo?.unreadCount || 0,
        };
      }),
    ];

    // 按最后消息时间排序（有消息的排在前）
    return list.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return 0; // 已经通过 conversationsMap 排序过了
    });
  }, [friends, groups, conversationsMap]);

  const isLoading =
    isLoadingFriends || isLoadingGroups || isLoadingConversations;

  // 过滤会话
  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1">
      <ResizablePanel defaultSize={25} minSize={20} maxSize={30}>
        <div className="h-full border-r bg-background">
          <ScrollArea className="h-full">
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">最近会话</h2>
              <div className="h-full flex flex-col gap-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索会话..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDialog("addFriend")}
                      className="w-10 h-10 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDialog("createGroup")}
                      className="w-10 h-10 p-0"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : filteredConversations.length > 0 ? (
                      filteredConversations.map((conversation) => (
                        <Link
                          key={conversation.id}
                          to="/messages/$chatId"
                          params={{ chatId: conversation.id }}
                          className="block p-3 rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <Avatar className="h-12 w-12">
                                <AvatarImage
                                  src={conversation.avatar || undefined}
                                />
                                <AvatarFallback>
                                  {conversation.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              {conversation.type === "friend" && (
                                <OnlineStatusIndicator
                                  userId={conversation.id.replace(
                                    "friend-",
                                    ""
                                  )}
                                  className="absolute -bottom-0.5 -right-0.5"
                                />
                              )}
                            </div>

                            <div className="flex-1 flex min-w-0">
                              <div className="flex flex-col items-start justify-between flex-1 min-w-0">
                                <h3 className="text-sm font-medium line-clamp-1 w-full">
                                  {conversation.name}
                                </h3>
                                <span className="text-xs text-muted-foreground  w-full line-clamp-1">
                                  {conversation.lastMessage}
                                </span>
                              </div>

                              <div className="flex flex-col items-center justify-between mt-1 ml-auto ">
                                <p className="text-xs text-muted-foreground">
                                  {conversation.time}
                                </p>
                                {conversation.unreadCount > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">暂无会话</p>
                        <p className="text-sm mt-2">
                          添加好友或创建群聊开始聊天
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={75}>
        <Outlet />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

// 格式化相对时间
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  // 超过一周显示具体日期
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}
