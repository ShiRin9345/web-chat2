"use client";

import { useChat } from "@ai-sdk/react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Loader2, Send, Bot } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DefaultChatTransport } from "ai";
import { API_BASE } from "@/lib/api-config";

export function AssistantChat() {
  const { data: session } = authClient.useSession();
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: `${API_BASE}/assistant/chat`,
      credentials: "include",
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">AI 助手</h1>
            <p className="text-sm text-muted-foreground">
              我可以帮您查询信息、搜索消息、查询文档等
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 text-lg font-semibold">开始对话</h2>
              <p className="text-muted-foreground">
                问我任何问题，我可以帮您查询信息或搜索消息
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex w-full gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return (
                        <div key={index} className="whitespace-pre-wrap">
                          {part.text}
                        </div>
                      );
                    }
                    // 处理其他类型的 parts（如 tool-call）
                    return null;
                  })}
                </div>
              </div>

              {message.role === "user" && session?.user?.image && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user.image} />
                  <AvatarFallback>
                    {session.user.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex w-full gap-3 justify-start">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-secondary rounded-lg px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
              <p className="text-sm">错误: {error.message}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入您的问题..."
            className="min-h-[60px] resize-none"
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="h-[60px] w-[60px]"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
