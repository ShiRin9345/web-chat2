import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { UserPlus, Users, Loader2, Bell, Search } from "lucide-react";
import { useFriends, useFriendRequests } from "@/queries/friends";
import { useGroups } from "@/queries/groups";
import { useDialogStore } from "@/stores/dialog";

export const Route = createFileRoute("/_authenticated/contacts")({
  component: ContactsPage,
});

function ContactsPage() {
  const { openDialog } = useDialogStore();
  const { data: contacts, isLoading: isLoadingFriends } = useFriends();
  const { data: groups, isLoading: isLoadingGroups } = useGroups();
  const { data: friendRequests } = useFriendRequests();
  const [searchQuery, setSearchQuery] = useState("");

  const pendingRequestsCount = friendRequests?.length || 0;

  // 过滤好友
  const filteredContacts = contacts?.filter((contact) => {
    const query = searchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query) ||
      (contact.code && contact.code.includes(query))
    );
  });

  // 过滤群组
  const filteredGroups = groups?.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={25} minSize={20} maxSize={30}>
          <div className="h-full border-r bg-background">
            <ScrollArea className="h-full">
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">联系人</h2>
                <div className="h-full flex flex-col gap-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="搜索联系人..."
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
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      {pendingRequestsCount > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog("friendRequests")}
                          className="w-10 h-10 p-0 relative"
                        >
                          <Bell className="h-4 w-4" />
                          <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                          >
                            {pendingRequestsCount}
                          </Badge>
                        </Button>
                      )}
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-6">
                      {/* 我的好友 */}
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                          我的好友 ({filteredContacts?.length || 0})
                        </h3>
                        {isLoadingFriends ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : filteredContacts && filteredContacts.length > 0 ? (
                          <div className="space-y-2">
                            {filteredContacts.map((contact) => (
                              <div
                                key={contact.id}
                                className="block p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                              >
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage
                                      src={contact.image || undefined}
                                    />
                                    <AvatarFallback>
                                      {contact.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>

                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium truncate">
                                      {contact.name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {contact.email}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">暂无好友</p>
                            <p className="text-xs">点击上方按钮添加好友</p>
                          </div>
                        )}
                      </div>

                      {/* 我的群聊 */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-muted-foreground">
                            我的群聊 ({filteredGroups?.length || 0})
                          </h3>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDialog("createGroup")}
                            className="h-6 px-2 text-xs"
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            创建群聊
                          </Button>
                        </div>
                        {isLoadingGroups ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : filteredGroups && filteredGroups.length > 0 ? (
                          <div className="space-y-2">
                            {filteredGroups.map((group) => (
                              <div
                                key={group.id}
                                className="block p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                              >
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage
                                      src={group.avatar || undefined}
                                    />
                                    <AvatarFallback>
                                      {group.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>

                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium truncate">
                                      {group.name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                      群聊
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">暂无群聊</p>
                            <p className="text-xs">点击上方按钮创建群聊</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 右侧内容区 - 默认显示空白，点击列表项后显示详情 */}
        <ResizablePanel defaultSize={75} minSize={30}>
          <div className="h-full bg-muted/20 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Users className="w-8 h-8" />
              </div>
              <p className="text-lg font-medium">选择一个联系人查看详情</p>
              <p className="text-sm mt-2">从左侧列表中选择一个联系人或群聊</p>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
