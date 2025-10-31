"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { authClient } from "@/lib/auth-client";
import { Bot } from "lucide-react";
import { DefaultChatTransport } from "ai";
import { API_BASE } from "@/lib/api-config";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  Loader,
  Message,
  MessageContent,
  MessageAvatar,
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputToolbar,
  PromptInputTools,
  Response,
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@workspace/ui/components/ai";

export function AssistantChat() {
  const { data: session } = authClient.useSession();
  const [input, setInput] = React.useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: `${API_BASE}/assistant/chat`,
      credentials: "include",
    }),
  });

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!input.trim() || status === "submitted" || status === "streaming")
      return;
    sendMessage({ text: input });
    setInput("");
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
      <Conversation>
        <ConversationContent>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 text-lg font-semibold">开始对话</h2>
              <p className="text-muted-foreground">
                问我任何问题，我可以帮您查询信息或搜索消息
              </p>
            </div>
          )}

          {messages.map((message, messageIndex) => {
            const isLastMessage = messageIndex === messages.length - 1;
            const isStreaming =
              isLastMessage &&
              message.role === "assistant" &&
              (status === "submitted" || status === "streaming");

            return (
              <Message key={message.id} from={message.role}>
                {message.role === "assistant" && (
                  <MessageAvatar icon={<Bot className="h-4 w-4" />} name="AI" />
                )}

                <MessageContent>
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return <Response key={index}>{part.text}</Response>;
                    }
                    if (
                      part.type &&
                      typeof part.type === "string" &&
                      part.type.startsWith("tool-")
                    ) {
                      // 处理工具调用
                      const toolPart = part as any;
                      const toolName =
                        toolPart.toolName ||
                        (toolPart.type?.replace("tool-", "") as string) ||
                        "tool";
                      const toolState = toolPart.state || "input-streaming";
                      const toolInput = toolPart.input || toolPart.args || {};

                      return (
                        <Tool key={index} defaultOpen={false}>
                          <ToolHeader type={toolName} state={toolState} />
                          <ToolContent>
                            <ToolInput input={toolInput} />
                            {toolPart.output && (
                              <ToolOutput
                                output={toolPart.output}
                                errorText={toolPart.errorText}
                              />
                            )}
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                  {/* 如果正在流式返回且这是最后一条消息，显示加载指示器 */}
                  {isStreaming && message.parts.length === 0 && (
                    <Loader size={16} />
                  )}
                </MessageContent>

                {message.role === "user" && session?.user?.image && (
                  <MessageAvatar
                    src={session.user.image}
                    name={session.user.name || "User"}
                  />
                )}
              </Message>
            );
          })}

          {/* 如果没有消息且正在加载，显示加载状态 */}
          {messages.length === 0 &&
            (status === "submitted" || status === "streaming") && (
              <Message from="assistant">
                <MessageAvatar icon={<Bot className="h-4 w-4" />} name="AI" />
                <MessageContent>
                  <Loader size={16} />
                </MessageContent>
              </Message>
            )}

          {error && (
            <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
              <p className="text-sm">错误: {error.message}</p>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input */}
      <div className="border-t p-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入您的问题..."
            minHeight={60}
            maxHeight={164}
          />
          <PromptInputToolbar>
            <PromptInputTools />
            <PromptInputSubmit status={status} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
}
