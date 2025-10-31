import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { UserPlus } from "lucide-react";
import type { RecommendedUser } from "@/queries/recommendations";

interface RecommendationItemProps {
  user: RecommendedUser;
  onAddFriend: (userId: string) => void;
  disabled?: boolean;
}

export function RecommendationItem({
  user,
  onAddFriend,
  disabled = false,
}: RecommendationItemProps) {
  const similarityPercent = Math.round(user.similarity * 100);

  return (
    <Card className="p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* 用户头像 */}
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.image || undefined} alt={user.name} />
          <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>

        {/* 用户信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium truncate">{user.name}</h4>
            <span className="text-xs text-muted-foreground shrink-0 ml-2">
              {similarityPercent}% 匹配
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate mb-2">
            {user.email}
          </p>

          {/* 共同标签 */}
          {user.commonTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {user.commonTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs bg-primary/10 text-primary"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* 相似度进度条 */}
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
              style={{ width: `${similarityPercent}%` }}
            />
          </div>
        </div>

        {/* 添加好友按钮 */}
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0"
          onClick={() => onAddFriend(user.id)}
          disabled={disabled}
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
