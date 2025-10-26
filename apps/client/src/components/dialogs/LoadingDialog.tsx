import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";

interface LoadingDialogProps {
  open: boolean;
  message?: string;
}

export function LoadingDialog({
  open,
  message = "加载中...",
}: LoadingDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="sr-only">加载中</DialogTitle>
        <div className="flex flex-col items-center justify-center py-8">
          {/* 加载动画 */}
          <div className="w-16 h-16 mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">{message}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
