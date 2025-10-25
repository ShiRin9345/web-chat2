import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
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
import { Plus, Loader2, MessageSquare } from "lucide-react";
import { useFriends } from "../../queries/friends.ts";
import { useGroups } from "../../queries/groups.ts";
import { useDialogStore } from "../../stores/dialog.ts";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesLayout,
});

function MessagesLayout() {
  const { openDialog } = useDialogStore();
  const { data: friends, isLoading: isLoadingFriends } = useFriends();
  const { data: groups, isLoading: isLoadingGroups } = useGroups();

  // 合并好友和群聊作为会话列表
  const conversations = [
    ...(friends || []).map((friend) => ({
      id: `friend-${friend.id}`,
      name: friend.name,
      avatar: friend.image,
      type: "friend" as const,
      lastMessage: "暂无消息",
      time: "刚刚",
      unreadCount: 0,
    })),
    ...(groups || []).map((group) => ({
      id: `group-${group.id}`,
      name: group.name,
      avatar: group.avatar,
      type: "group" as const,
      lastMessage: "暂无消息",
      time: "刚刚",
      unreadCount: 0,
    })),
  ];

  const isLoading = isLoadingFriends || isLoadingGroups;

  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1">
      <ResizablePanel defaultSize={25} minSize={20} maxSize={30}>
        <div className="h-full border-r bg-background">
          <ScrollArea className="h-full">
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">最近会话</h2>
              <div className="h-full flex flex-col gap-2">
                <div className="flex gap-2">
                  <Input placeholder="搜索会话..." className="pl-10" />
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
                    ) : conversations.length > 0 ? (
                      conversations.map((conversation) => (
                        <Link
                          key={conversation.id}
                          to="/messages/$chatId"
                          params={{ chatId: conversation.id }}
                          className="block p-3 rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={conversation.avatar} />
                              <AvatarFallback>
                                {conversation.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 flex min-w-0">
                              <div className="flex flex-col items-start justify-between flex-1 min-w-0">
                                <h3 className="text-sm font-medium line-clamp-1 w-full">
                                  {conversation.name}
                                </h3>
                                <span className="text-xs text-muted-foreground line-clamp-1">
                                  {conversation.lastMessage}
                                </span>
                              </div>

                              <div className="flex flex-col items-center justify-between mt-1 ml-auto">
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
