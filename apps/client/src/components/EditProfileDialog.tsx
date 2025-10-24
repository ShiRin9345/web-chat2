import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Camera, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import uploadAvatarToOSS from "@/utils/uploadAvatar";
import { updateUserProfile } from "@/actions/auth";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileDialog({
  open,
  onOpenChange,
}: EditProfileDialogProps) {
  const { data: session } = authClient.useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    session?.user?.image || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith("image/")) {
        alert("请选择图片文件");
        return;
      }

      // 验证文件大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("图片大小不能超过 5MB");
        return;
      }

      selectedFileRef.current = file;

      // 创建预览 URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("请输入姓名");
      return;
    }

    setIsSaving(true);
    try {
      let avatarUrl = session?.user?.image;

      // 如果有新选择的文件，先上传头像
      if (selectedFileRef.current) {
        setIsUploading(true);
        avatarUrl = await uploadAvatarToOSS(selectedFileRef.current);
        setIsUploading(false);
      }

      // 更新用户信息
      await updateUserProfile({
        name: name.trim(),
        image: avatarUrl || undefined,
      });

      // 关闭对话框
      onOpenChange(false);

      // 清理状态
      setName(session?.user?.name || "");
      setPreviewUrl(session?.user?.image || null);
      selectedFileRef.current = null;
    } catch (error) {
      console.error("保存失败:", error);
      alert("保存失败，请重试");
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    // 重置状态
    setName(session?.user?.name || "");
    setPreviewUrl(session?.user?.image || null);
    selectedFileRef.current = null;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑资料</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 头像上传区域 */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar
                className="h-24 w-24 cursor-pointer"
                onClick={handleAvatarClick}
              >
                <AvatarImage src={previewUrl || undefined} />
                <AvatarFallback className="text-2xl">
                  {name.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>

              {/* 上传按钮 */}
              <Button
                size="sm"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                variant="secondary"
                onClick={handleAvatarClick}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              点击头像或相机图标上传新头像
            </p>

            {/* 隐藏的文件输入 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* 表单字段 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入姓名"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                value={session?.user?.email || ""}
                disabled
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                邮箱地址不可修改
              </p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              disabled={isSaving}
            >
              取消
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={isSaving || isUploading}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
