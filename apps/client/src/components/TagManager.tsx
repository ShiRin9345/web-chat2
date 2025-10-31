import { useState } from "react";
import { Badge } from "@workspace/ui/badge";
import { Button } from "@workspace/ui/button";
import { Input } from "@workspace/ui/input";
import { Label } from "@workspace/ui/label";
import { ScrollArea } from "@workspace/ui/scroll-area";
import { X, Plus, Save, Loader2 } from "lucide-react";
import { usePredefinedTags } from "@/queries/tags";
import { cn } from "@workspace/ui/utils";

interface TagManagerProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onSave: (tags: string[]) => void;
  isSaving?: boolean;
}

export function TagManager({
  selectedTags,
  onTagsChange,
  onSave,
  isSaving = false,
}: TagManagerProps) {
  const [customTagInput, setCustomTagInput] = useState("");
  const { data: predefinedData, isLoading } = usePredefinedTags();

  const MAX_TAGS = 8;
  const isLimitReached = selectedTags.length >= MAX_TAGS;

  const handleAddCustomTag = () => {
    const tag = customTagInput.trim();
    if (!tag) return;

    // 验证标签
    if (tag.length > 20) {
      alert("标签长度不能超过20个字符");
      return;
    }

    const validPattern = /^[\u4e00-\u9fa5a-zA-Z0-9]+$/;
    if (!validPattern.test(tag)) {
      alert("标签只能包含中文、英文或数字");
      return;
    }

    if (selectedTags.includes(tag)) {
      alert("标签已存在");
      return;
    }

    if (isLimitReached) {
      alert(`最多只能选择${MAX_TAGS}个标签`);
      return;
    }

    onTagsChange([...selectedTags, tag]);
    setCustomTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    onTagsChange(selectedTags.filter((t) => t !== tag));
  };

  const handleTogglePredefinedTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      handleRemoveTag(tagName);
    } else {
      if (isLimitReached) {
        alert(`最多只能选择${MAX_TAGS}个标签`);
        return;
      }
      onTagsChange([...selectedTags, tagName]);
    }
  };

  return (
    <div className="space-y-4">
      {/* 已选标签 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>已选标签 ({selectedTags.length}/{MAX_TAGS})</Label>
          <Button
            size="sm"
            onClick={() => onSave(selectedTags)}
            disabled={isSaving || selectedTags.length === 0}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                保存
              </>
            )}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md bg-muted/30">
          {selectedTags.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              请选择或输入标签
            </span>
          ) : (
            selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="px-3 py-1 cursor-pointer hover:bg-destructive/20"
                onClick={() => handleRemoveTag(tag)}
              >
                {tag}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))
          )}
        </div>
      </div>

      {/* 自定义标签输入 */}
      <div>
        <Label>自定义标签</Label>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="输入标签名称 (最多20字符)"
            value={customTagInput}
            onChange={(e) => setCustomTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustomTag();
              }
            }}
            maxLength={20}
            disabled={isLimitReached}
          />
          <Button
            size="icon"
            variant="outline"
            onClick={handleAddCustomTag}
            disabled={isLimitReached || !customTagInput.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 预定义标签 */}
      <div>
        <Label>预定义标签</Label>
        <ScrollArea className="h-[300px] mt-2 border rounded-md p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {predefinedData?.categories.map((category) => (
                <div key={category.category}>
                  <h4 className="font-medium text-sm mb-2">
                    {category.displayName}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {category.tags.map((tag) => {
                      const isSelected = selectedTags.includes(tag.name);
                      const isDisabled = !isSelected && isLimitReached;

                      return (
                        <Badge
                          key={tag.name}
                          variant={isSelected ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer transition-colors",
                            isDisabled && "opacity-50 cursor-not-allowed"
                          )}
                          onClick={() =>
                            !isDisabled && handleTogglePredefinedTag(tag.name)
                          }
                        >
                          {tag.displayName}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
