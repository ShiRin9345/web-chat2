import { createFileRoute } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Send,
  Phone,
  Video,
  MoreHorizontal,
  MessageSquare,
} from "lucide-react";
import { useDialogStore } from "@/stores/dialog";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { useSocket } from "@/providers/SocketProvider";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/messages/$chatId")({
  component: ChatPage,
  validateSearch: (search: Record<string, unknown>) => {
    return search;
  },
  beforeLoad: async ({ params }) => {
    console.log("Loading chat with ID:", params.chatId);
    return {};
  },
});

function ChatPage() {
  const { chatId } = Route.useParams();
  console.log("ChatPage rendered with chatId:", chatId);
  const { openDialog } = useDialogStore();
  const socket = useSocket();
  const session = authClient.useSession();
  const userId = session.data?.user.id || "";
  const [onlineFriends, setOnlineFriends] = useState<string[]>([]);

  // 解析 chatId 获取类型和实际 ID
  const isGroup = chatId.startsWith("group-");
  const isFriend = chatId.startsWith("friend-");
  const actualId = chatId.replace(/^(friend-|group-)/, "");

  // 获取好友信息（只在是好友聊天时）
  const { data: friendInfo } = useQuery({
    queryKey: ["user", actualId],
    queryFn: async () => {
      if (!isFriend || !actualId) return null;
      const response = await fetch(
        `http://localhost:3001/api/friends/user/${actualId}`,
        {
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: isFriend && !!actualId,
  });

  // 监听在线状态
  useEffect(() => {
    if (!socket) return;

    const handleFriendOnline = (friendId: string) => {
      setOnlineFriends((prev) => [...new Set([...prev, friendId])]);
    };

    const handleFriendOffline = (friendId: string) => {
      setOnlineFriends((prev) => prev.filter((id) => id !== friendId));
    };

    socket.on("friend:online", handleFriendOnline);
    socket.on("friend:offline", handleFriendOffline);

    // 获取在线好友列表
    socket.emit("user:get-online-friends", (friendIds: string[]) => {
      setOnlineFriends(friendIds);
    });

    return () => {
      socket.off("friend:online", handleFriendOnline);
      socket.off("friend:offline", handleFriendOffline);
    };
  }, [socket]);

  const isOnline = isFriend && onlineFriends.includes(actualId);

  // 暂时显示占位内容，不实现实际的消息功能
  const chatInfo = {
    name: isFriend && friendInfo ? friendInfo.name : (isGroup ? "群聊" : "好友"),
    avatar: isFriend && friendInfo ? friendInfo.image : "",
    isOnline: isOnline,
  };

  // 发起视频通话
  const handleVideoCall = () => {
    if (!isFriend) {
      alert("仅支持与好友进行通话");
      return;
    }

    if (!isOnline) {
      alert("对方当前不在线");
      return;
    }

    if (!navigator.mediaDevices) {
      alert("您的浏览器不支持通话功能");
      return;
    }

    openDialog("videoCall", {
      roomId: chatId,
      friendId: actualId,
      friendName: chatInfo.name,
      friendAvatar: chatInfo.avatar,
      callType: "video",
      isInitiator: true,
    });
  };

  // 发起语音通话
  const handleAudioCall = () => {
    if (!isFriend) {
      alert("仅支持与好友进行通话");
      return;
    }

    if (!isOnline) {
      alert("对方当前不在线");
      return;
    }

    if (!navigator.mediaDevices) {
      alert("您的浏览器不支持通话功能");
      return;
    }

    openDialog("audioCall", {
      roomId: chatId,
      friendId: actualId,
      friendName: chatInfo.name,
      friendAvatar: chatInfo.avatar,
      callType: "audio",
      isInitiator: true,
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* 聊天头部 */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={chatInfo.avatar} />
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
          <Button size="sm" variant="ghost" onClick={handleAudioCall} disabled={!isFriend || !isOnline}>
            <Phone className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleVideoCall} disabled={!isFriend || !isOnline}>
            <Video className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 消息区域 */}
      <ScrollArea className="flex-1 p-4">
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="w-8 h-8" />
            </div>
            <p className="text-lg font-medium">聊天功能开发中</p>
            <p className="text-sm mt-2">消息发送和接收功能暂未实现</p>
            <p className="text-xs mt-1">Chat ID: {chatId}</p>
          </div>
        </div>
      </ScrollArea>

      {/* 消息输入区域 - 暂时禁用 */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2 opacity-50">
          <Input placeholder="消息功能开发中..." className="flex-1" disabled />
          <Button size="sm" disabled>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
