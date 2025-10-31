import { Users } from "lucide-react";

export function ContactDetailsPlaceholder() {
  return (
    <div className="h-full bg-muted/20 flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Users className="w-8 h-8" />
        </div>
        <p className="text-lg font-medium">选择一个联系人查看详情</p>
        <p className="text-sm mt-2">从左侧列表中选择一个联系人或群聊</p>
      </div>
    </div>
  );
}
