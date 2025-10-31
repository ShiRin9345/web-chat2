import { useState } from "react";
import type { FriendRequest, User } from "@workspace/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Loader2, Check, X, Clock } from "lucide-react";
import {
  useFriendRequests,
  useAcceptFriendRequest,
  useRejectFriendRequest,
} from "@/queries/friends";

interface FriendRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FriendRequestsDialog({
  open,
  onOpenChange,
}: FriendRequestsDialogProps) {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const { data: requests, isLoading } = useFriendRequests();
  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();

  const handleAccept = async (requestId: string) => {
    setProcessingIds((prev) => new Set(prev).add(requestId));
    try {
      await acceptRequest.mutateAsync(requestId);
    } catch (error) {
      console.error("Failed to accept friend request:", error);
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingIds((prev) => new Set(prev).add(requestId));
    try {
      await rejectRequest.mutateAsync(requestId);
    } catch (error) {
      console.error("Failed to reject friend request:", error);
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "刚刚";
    if (diffInHours < 24) return `${diffInHours}小时前`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}天前`;
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>好友申请</DialogTitle>
          <DialogDescription>管理收到的好友申请</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : requests && requests.length > 0 ? (
            <div className="space-y-3">
              {requests.map((request: FriendRequest & { fromUser?: User }) => (
                <div
                  key={request.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={request.fromUser?.image || undefined} />
                    <AvatarFallback>
                      {request.fromUser?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-medium text-sm">
                        {request.fromUser?.name}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(request.createdAt.toString())}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground mb-2">
                      {request.fromUser?.email}
                    </p>

                    {request.message && (
                      <p className="text-sm bg-muted/50 p-2 rounded text-muted-foreground">
                        "{request.message}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col space-y-1">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(request.id)}
                      disabled={processingIds.has(request.id)}
                      className="h-8 px-3"
                    >
                      {processingIds.has(request.id) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(request.id)}
                      disabled={processingIds.has(request.id)}
                      className="h-8 px-3"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>暂无好友申请</p>
              <p className="text-xs">当有人向你发送好友申请时会显示在这里</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
