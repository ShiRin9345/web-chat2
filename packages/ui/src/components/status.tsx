import * as React from "react";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

export type StatusProps = ComponentProps<typeof Badge> & {
  status: "online" | "offline" | "maintenance" | "degraded";
  children?: ReactNode;
};

export const Status = ({
  className,
  status,
  children,
  ...props
}: StatusProps) => {
  // 检查是否有文本内容
  const childrenArray = React.Children.toArray(children);
  const hasText = childrenArray.some((child) => {
    // 检查是否有字符串
    if (typeof child === "string" && child.trim().length > 0) return true;
    // 检查是否是 StatusLabel 或有文本内容的元素
    if (typeof child === "object" && child !== null && "props" in child) {
      const childProps = child.props as {
        className?: string;
        children?: ReactNode;
      };
      // StatusLabel 有 text-muted-foreground 类
      if (childProps.className?.includes("text-muted-foreground")) return true;
      // 或者有文本子元素
      if (
        typeof childProps.children === "string" &&
        childProps.children.trim().length > 0
      ) {
        return true;
      }
    }
    return false;
  });

  if (!hasText) {
    // 只有状态指示器时，不使用 Badge 的背景和边框，直接使用透明背景的 span
    return (
      <span
        className={cn("flex items-center gap-2", "group", status, className)}
        {...props}
      >
        {children}
      </span>
    );
  }

  // 有文本时使用 Badge（保持原有的 Badge 样式）
  return (
    <Badge
      className={cn("flex items-center gap-2", "group", status, className)}
      variant="secondary"
      {...props}
    >
      {children}
    </Badge>
  );
};

export type StatusIndicatorProps = HTMLAttributes<HTMLSpanElement>;

export const StatusIndicator = ({
  className,
  ...props
}: StatusIndicatorProps) => (
  <span className="relative flex h-2 w-2" {...props}>
    <span
      className={cn(
        "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
        "group-[.online]:bg-emerald-500",
        "group-[.offline]:bg-red-500",
        "group-[.maintenance]:bg-blue-500",
        "group-[.degraded]:bg-amber-500"
      )}
    />
    <span
      className={cn(
        "relative inline-flex h-2 w-2 rounded-full",
        "group-[.online]:bg-emerald-500",
        "group-[.offline]:bg-red-500",
        "group-[.maintenance]:bg-blue-500",
        "group-[.degraded]:bg-amber-500"
      )}
    />
  </span>
);

export type StatusLabelProps = HTMLAttributes<HTMLSpanElement>;

export const StatusLabel = ({
  className,
  children,
  ...props
}: StatusLabelProps) => (
  <span className={cn("text-muted-foreground", className)} {...props}>
    {children ?? (
      <>
        <span className="hidden group-[.online]:block">Online</span>
        <span className="hidden group-[.offline]:block">Offline</span>
        <span className="hidden group-[.maintenance]:block">Maintenance</span>
        <span className="hidden group-[.degraded]:block">Degraded</span>
      </>
    )}
  </span>
);
