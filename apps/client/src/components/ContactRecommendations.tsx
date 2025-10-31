import { useState } from "react";
import { Card } from "@workspace/ui/components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { TagManager } from "./TagManager";
import { RecommendationList } from "./RecommendationList";
import { useUserTags, useUpdateUserTags } from "@/queries/tags";
import { useSendFriendRequest } from "@/queries/friends";
import { Settings, Loader2 } from "lucide-react";
import { toast } from "@workspace/ui/components/sonner";

export function ContactRecommendations() {
  const [activeTab, setActiveTab] = useState<"recommendations" | "tags">(
    "recommendations"
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: userTagsData, isLoading: isLoadingTags } = useUserTags();
  const updateTagsMutation = useUpdateUserTags();
  const sendFriendRequestMutation = useSendFriendRequest();

  // 同步用户标签到本地状态
  useState(() => {
    if (userTagsData?.tags) {
      setSelectedTags(userTagsData.tags);
    }
  });

  // 当用户标签数据加载完成时,更新本地状态
  if (
    userTagsData?.tags &&
    selectedTags.length === 0 &&
    userTagsData.tags.length > 0
  ) {
    setSelectedTags(userTagsData.tags);
  }

  const handleSaveTags = async (tags: string[]) => {
    try {
      await updateTagsMutation.mutateAsync(tags);
      toast.success("保存成功", {
        description: "标签已更新,推荐列表将自动刷新",
      });
      setActiveTab("recommendations");
    } catch (error: any) {
      toast.error("保存失败", {
        description: error.message || "请稍后重试",
      });
    }
  };

  const handleAddFriend = async (userId: string) => {
    try {
      await sendFriendRequestMutation.mutateAsync({
        toUserId: userId,
        message: "你好,我想加你为好友",
      });
      toast.success("好友请求已发送", {
        description: "等待对方同意",
      });
    } catch (error: any) {
      toast.error("发送失败", {
        description: error.message || "请稍后重试",
      });
    }
  };

  if (isLoadingTags) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={(v: string) => setActiveTab(v as any)}
      >
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="recommendations">推荐好友</TabsTrigger>
            <TabsTrigger value="tags">
              <Settings className="h-4 w-4 mr-2" />
              管理标签
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="recommendations" className="mt-0">
          <Card className="p-4">
            <RecommendationList
              onAddFriend={handleAddFriend}
              hasUserTags={!!userTagsData?.tags && userTagsData.tags.length > 0}
            />
          </Card>
        </TabsContent>

        <TabsContent value="tags" className="mt-0">
          <Card className="p-4">
            <TagManager
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              onSave={handleSaveTags}
              isSaving={updateTagsMutation.isPending}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
