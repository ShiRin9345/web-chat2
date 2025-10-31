import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { RecommendationItem } from "./RecommendationItem";
import {
  useRecommendations,
  useRefreshRecommendations,
} from "@/queries/recommendations";
import { Skeleton } from "@workspace/ui/components/skeleton";

interface RecommendationListProps {
  onAddFriend: (userId: string) => void;
  hasUserTags: boolean;
}

export function RecommendationList({
  onAddFriend,
  hasUserTags,
}: RecommendationListProps) {
  const { data, isLoading, refetch, isRefetching } = useRecommendations(5);
  const refresh = useRefreshRecommendations();

  const handleRefresh = () => {
    refresh();
    refetch();
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  // 未设置标签状态
  if (!hasUserTags) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-medium text-lg mb-2">设置你的兴趣标签</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          告诉我们你的兴趣爱好，我们会为你推荐志同道合的朋友
        </p>
      </div>
    );
  }

  // 无推荐结果
  if (!data || data.recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg mb-2">暂无推荐</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          试试添加更多标签，或者稍后再来看看
        </p>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新
        </Button>
      </div>
    );
  }

  // 正常推荐列表
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-medium">为你推荐</h3>
          <span className="text-sm text-muted-foreground">
            ({data.total} 人)
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefetching}
        >
          {isRefetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="space-y-3">
        {data.recommendations.map((user) => (
          <RecommendationItem
            key={user.id}
            user={user}
            onAddFriend={onAddFriend}
          />
        ))}
      </div>
    </div>
  );
}
