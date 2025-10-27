import { createFileRoute } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Send,
  Phone,
  Video,
  MoreHorizontal,
  MessageSquare,
} from "lucide-react";
import { useChatInfo } from "@/hooks/useChatInfo";
import { VirtualList, type VirtualListRef } from "@/components/VirtualList";
import { useRef, useState, useCallback } from "react";

// 消息类型定义
interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: "text" | "image" | "file";
  isOwn: boolean;
}

// 模拟消息数据
const generateMockMessages = (count: number): Message[] => {
  const messages: Message[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const isOwn = i % 3 === 0; // 每3条消息中有一条是自己的
    const messageTypes: Array<"text" | "image" | "file"> = [
      "text",
      "text",
      "text",
      "image",
      "file",
    ];
    const type = messageTypes[i % messageTypes.length] as
      | "text"
      | "image"
      | "file";

    let content = "";
    switch (type) {
      case "text":
        content = `这是一条测试消息 ${i + 1}。${
          i % 5 === 0
            ? " 这是一条比较长的消息，用来测试虚拟列表在不同高度下的表现。"
            : ""
        }`;
        break;
      case "image":
        content = "[图片]";
        break;
      case "file":
        content = "[文件] document.pdf";
        break;
    }

    messages.push({
      id: `msg-${i}`,
      content,
      senderId: isOwn ? "me" : "other",
      senderName: isOwn ? "我" : "对方",
      timestamp: new Date(now.getTime() - (count - i) * 60000), // 每分钟一条消息
      type,
      isOwn,
    });
  }

  return messages;
};

export const Route = createFileRoute("/_authenticated/messages/$chatId")({
  component: ChatPage,
  validateSearch: (search: Record<string, unknown>) => {
    return search;
  },
  // 移除 loader，因为 useChatInfo 现在会优先从 friends 缓存中获取数据
});

function ChatPage() {
  const { chatId } = Route.useParams();
  const { chatInfo, handleVideoCall, handleAudioCall } = useChatInfo({
    chatId,
  });

  // VirtualList 相关状态
  const virtualListRef = useRef<VirtualListRef>(null);
  const [messages, setMessages] = useState<Message[]>(() =>
    generateMockMessages(1000)
  ); // 生成1000条消息用于测试
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLast, setIsLast] = useState(false);

  // 加载更多消息
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);

    // 模拟异步加载
    setTimeout(() => {
      const newMessages = generateMockMessages(50); // 每次加载50条
      setMessages((prev) => [...newMessages, ...prev]);
      setIsLoadingMore(false);

      // 如果消息总数超过2000条，标记为最后一页
      if (messages.length + 50 >= 2000) {
        setIsLast(true);
      }
    }, 1000);
  }, [isLoadingMore, messages.length]);

  // 渲染单条消息
  const renderMessage = useCallback((message: Message, _index: number) => {
    return (
      <div
        key={message.id}
        className={`flex ${
          message.isOwn ? "justify-end" : "justify-start"
        } mb-4 px-4`}
      >
        <div className={`max-w-[70%] ${message.isOwn ? "order-2" : "order-1"}`}>
          {!message.isOwn && (
            <div className="text-xs text-muted-foreground mb-1 px-1">
              {message.senderName}
            </div>
          )}
          <div
            className={`px-3 py-2 rounded-lg ${
              message.isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            <div className="text-sm">{message.content}</div>
            <div
              className={`text-xs mt-1 ${
                message.isOwn
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground"
              }`}
            >
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
        {!message.isOwn && (
          <div className="order-1 mr-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{message.senderName.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    );
  }, []);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    virtualListRef.current?.scrollTo({
      position: "bottom",
      behavior: "smooth",
    });
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* 聊天头部 */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={chatInfo.avatar || undefined} />
              <AvatarFallback>{chatInfo.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {chatInfo.isOnline && (
              <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
          <div>
            <h2 className="font-semibold">{chatInfo.name}</h2>
            <p className="text-sm text-muted-foreground">
              {chatInfo.isOnline ? "在线" : "离线"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAudioCall}
            disabled={chatInfo.type !== "friend" || !chatInfo.isOnline}
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleVideoCall}
            disabled={chatInfo.type !== "friend" || !chatInfo.isOnline}
          >
            <Video className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 消息区域 - 使用 VirtualList */}
      <div className="flex-1 relative">
        <VirtualList
          ref={virtualListRef}
          items={messages.map((msg) => ({ message: { id: msg.id }, ...msg }))}
          renderItem={renderMessage}
          estimatedItemHeight={80}
          isLoadingMore={isLoadingMore}
          isLast={isLast}
          onLoadMore={handleLoadMore}
          onScrollDirectionChange={(direction) => {
            console.log("滚动方向:", direction);
          }}
          onVisibleItemsChange={(ids) => {
            console.log("可见消息ID:", ids);
          }}
        />

        {/* 滚动到底部按钮 */}
        <Button
          size="sm"
          className="absolute bottom-4 right-4 rounded-full"
          onClick={scrollToBottom}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>

      {/* 消息输入区域 */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <Input placeholder="输入消息..." className="flex-1" />
          <Button size="sm">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
