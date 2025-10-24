import { createFileRoute, Link } from "@tanstack/react-router";
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
import { MessageSquare, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  // 模拟数据
  const conversations = [
    {
      id: "1",
      name: "张三",
      avatar: "",
      lastMessage: "你好，最近怎么样？",
      time: "10:30",
      unreadCount: 2,
      isOnline: true,
    },
    {
      id: "2",
      name: "李四",
      avatar: "",
      lastMessage: "明天见！",
      time: "09:15",
      unreadCount: 0,
      isOnline: false,
    },
    {
      id: "3",
      name: "工作群sfdsfsdfsdf",
      avatar: "",
      lastMessage: "王五: 今天的会议推迟到下午3点",
      time: "08:45",
      unreadCount: 5,
      isOnline: true,
    },
  ];

  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={25} minSize={20} maxSize={30}>
          <div className="h-full border-r bg-background">
            <ScrollArea className="h-full">
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">最近会话</h2>
                <div className="h-full flex flex-col gap-2">
                  <div className="flex gap-2 ">
                    <Input placeholder="搜索会话..." className="pl-10" />
                    <div className="flex justify-center w-10 h-10 border rounded-md items-center">
                      <Plus className="" />
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="p-2">
                      {conversations.map((conversation) => (
                        <Link
                          key={conversation.id}
                          to="/messages/$chatId"
                          params={{ chatId: conversation.id }}
                          className="block p-3 rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={conversation.avatar} />
                                <AvatarFallback>
                                  {conversation.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              {conversation.isOnline && (
                                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                              )}
                            </div>

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
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={75}>
          <div className="h-full bg-muted/20 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="w-8 h-8" />
              </div>
              <p className="text-lg font-medium">选择一个会话开始聊天</p>
              <p className="text-sm mt-2">从左侧列表中选择一个联系人或群聊</p>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
