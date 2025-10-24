import { createFileRoute } from "@tanstack/react-router";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Check, X, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/requests")({
  component: RequestsPage,
});

function RequestsPage() {
  // 模拟好友申请数据
  const requests = [
    {
      id: "1",
      fromUser: {
        id: "user1",
        name: "张三",
        avatar: "",
        mutualFriends: 5,
      },
      message: "你好，我是通过朋友介绍认识你的",
      time: "2小时前",
      status: "pending",
    },
    {
      id: "2",
      fromUser: {
        id: "user2",
        name: "李四",
        avatar: "",
        mutualFriends: 2,
      },
      message: "我们是一个公司的同事",
      time: "1天前",
      status: "pending",
    },
    {
      id: "3",
      fromUser: {
        id: "user3",
        name: "王五",
        avatar: "",
        mutualFriends: 0,
      },
      message: "",
      time: "3天前",
      status: "accepted",
    },
  ];

  const handleAccept = (requestId: string) => {
    console.log("Accept request:", requestId);
    // TODO: 实现接受好友申请逻辑
  };

  const handleReject = (requestId: string) => {
    console.log("Reject request:", requestId);
    // TODO: 实现拒绝好友申请逻辑
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部标题 */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">好友申请</h2>
          <Badge variant="secondary">
            {requests.filter((r) => r.status === "pending").length} 个待处理
          </Badge>
        </div>
      </div>

      {/* 申请列表 */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={request.fromUser.avatar} />
                    <AvatarFallback>
                      {request.fromUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{request.fromUser.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {request.time}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mt-1">
                      {request.fromUser.mutualFriends} 个共同好友
                    </p>

                    {request.message && (
                      <p className="text-sm mt-2 p-2 bg-muted rounded">
                        "{request.message}"
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      {request.status === "pending" ? (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleAccept(request.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            接受
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(request.id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            拒绝
                          </Button>
                        </div>
                      ) : (
                        <Badge
                          variant={
                            request.status === "accepted"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {request.status === "accepted" ? "已接受" : "已拒绝"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
