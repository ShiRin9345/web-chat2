import { createFileRoute } from "@tanstack/react-router";
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
import { UserPlus, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/contacts")({
  component: ContactsPage,
});

function ContactsPage() {
  const contacts = [
    {
      id: "1",
      name: "张三",
      avatar: "",
      status: "在线",
      isOnline: true,
      lastSeen: "刚刚",
    },
    {
      id: "2",
      name: "李四",
      avatar: "",
      status: "离线",
      isOnline: false,
      lastSeen: "2小时前",
    },
    {
      id: "3",
      name: "王五",
      avatar: "",
      status: "忙碌",
      isOnline: true,
      lastSeen: "1小时前",
    },
  ];

  const groups = [
    {
      id: "1",
      name: "工作群",
      avatar: "",
      memberCount: 15,
    },
    {
      id: "2",
      name: "同学群",
      avatar: "",
      memberCount: 8,
    },
  ];

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
                    <Input placeholder="搜索联系人..." className="pl-10" />
                    <div className="flex justify-center w-10 h-10 border rounded-md items-center">
                      <UserPlus className="h-4 w-4" />
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-6">
                      {/* 我的好友 */}
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                          我的好友 ({contacts.length})
                        </h3>
                        <div className="space-y-2">
                          {contacts.map((contact) => (
                            <div
                              key={contact.id}
                              className="block p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="relative">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={contact.avatar} />
                                    <AvatarFallback>
                                      {contact.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  {contact.isOnline && (
                                    <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium truncate">
                                      {contact.name}
                                    </h4>
                                    <Badge
                                      variant={
                                        contact.isOnline
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {contact.status}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {contact.isOnline
                                      ? "在线"
                                      : `最后活跃: ${contact.lastSeen}`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 我的群聊 */}
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                          我的群聊 ({groups.length})
                        </h3>
                        <div className="space-y-2">
                          {groups.map((group) => (
                            <div
                              key={group.id}
                              className="block p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                            >
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={group.avatar} />
                                  <AvatarFallback>
                                    {group.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium truncate">
                                    {group.name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {group.memberCount} 个成员
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
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
        <ResizablePanel defaultSize={70}>
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
