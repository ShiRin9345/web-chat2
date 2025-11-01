import { createFileRoute } from "@tanstack/react-router";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

export const Route = createFileRoute("/_authenticated/settings/storage")({
  component: StorageSettings,
});

function StorageSettings() {
  return (
    <div className="h-full bg-background">
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          <h3 className="text-lg font-semibold mb-4">存储管理</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>自动清理缓存</Label>
                <p className="text-sm text-muted-foreground">定期清理临时文件</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>文件大小限制</Label>
                <p className="text-sm text-muted-foreground">单个文件最大 100MB</p>
              </div>
              <Select defaultValue="100">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50MB</SelectItem>
                  <SelectItem value="100">100MB</SelectItem>
                  <SelectItem value="200">200MB</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
