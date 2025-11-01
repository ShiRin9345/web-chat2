import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/")({
  component: SettingsIndex,
});

function SettingsIndex() {
  return (
    <div className="h-full bg-muted/20 flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <p className="text-lg font-medium">选择一个设置分类</p>
        <p className="text-sm mt-2">从左侧列表中选择一个设置分类</p>
      </div>
    </div>
  );
}
