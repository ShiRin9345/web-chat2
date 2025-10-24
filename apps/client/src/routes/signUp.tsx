import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useActionState, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@workspace/ui/components/field";
import { signUpAction } from "@/actions/auth";
import { Upload, User } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/signUp")({
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");

  const [state, formAction, isPending] = useActionState(
    async (prevState: { error?: string }, formData: FormData) => {
      // 如果有头像 URL，添加到 formData 中
      if (avatarUrl) {
        formData.set("avatar", avatarUrl);
      }

      const result = await signUpAction(prevState, formData);

      // 如果注册成功，跳转到首页
      if (!result.error) {
        navigate({ to: "/" });
      }

      return result;
    },
    { error: undefined }
  );

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setUploadError("");

    try {
      // 获取 STS 临时凭证
      const response = await fetch(
        "http://localhost:3001/api/oss/get_sts_token_for_oss_upload",
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error(
          `获取STS令牌失败: ${response.status} ${response.statusText}`
        );
      }

      const credentials = await response.json();

      // 动态导入 OSS SDK
      const OSS = (await import("ali-oss")).default;

      const client = new OSS({
        bucket: "shirin-123",
        region: "oss-cn-beijing",
        accessKeyId: credentials.AccessKeyId,
        accessKeySecret: credentials.AccessKeySecret,
        stsToken: credentials.SecurityToken,
      });

      // 生成唯一的文件名
      const fileName = `avatars/${session?.user?.id}-${file.name}`;

      // 上传文件
      const result = await client.put(fileName, file);

      // 设置头像 URL
      setAvatarUrl(result.url);
    } catch (error) {
      console.error("上传失败:", error);
      setUploadError("头像上传失败，请重试");
    } finally {
      setIsUploading(false);
    }
  };

  // 处理文件选择
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith("image/")) {
        setUploadError("请选择图片文件");
        return;
      }

      // 验证文件大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("图片大小不能超过 5MB");
        return;
      }

      handleFileUpload(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">注册账户</h1>
          <p className="mt-2 text-sm text-gray-600">创建你的 Web Chat 账户</p>
          <p className="mt-1 text-xs text-amber-600">* 头像为必填项</p>
        </div>

        <form className="mt-8 space-y-6" action={formAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">姓名</FieldLabel>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="请输入你的姓名"
                autoComplete="name"
              />
              <FieldDescription>这将显示在你的个人资料中</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="email">邮箱地址</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="请输入邮箱地址"
                autoComplete="email"
              />
              <FieldDescription>我们将使用此邮箱与你联系</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="password">密码</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="请输入密码"
                autoComplete="new-password"
              />
              <FieldDescription>密码至少需要 6 个字符</FieldDescription>
            </Field>

            <Field>
              <FieldLabel>头像 *</FieldLabel>
              <div className="flex flex-col items-center space-y-4">
                {/* 圆形头像预览/上传区域 */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="头像预览"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <User className="w-8 h-8" />
                        <span className="text-xs mt-1">点击上传</span>
                      </div>
                    )}
                  </div>

                  {/* 上传按钮覆盖层 */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-20 rounded-full transition-all">
                    <Upload className="w-6 h-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
                  </div>

                  {/* 隐藏的文件输入 */}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                </div>

                {/* 上传状态和错误信息 */}
                {isUploading && (
                  <div className="text-sm text-blue-600 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    上传中...
                  </div>
                )}

                {uploadError && (
                  <div className="text-sm text-red-600">{uploadError}</div>
                )}

                {avatarUrl && !isUploading && (
                  <div className="text-sm text-green-600">✓ 头像上传成功</div>
                )}
              </div>

              <FieldDescription>
                点击上方圆形区域选择头像图片，支持 JPG、PNG 格式，大小不超过 5MB
              </FieldDescription>

              {/* 隐藏的输入字段，用于表单提交 */}
              <input type="hidden" name="avatar" value={avatarUrl} required />
            </Field>
          </FieldGroup>

          {state.error && <FieldError>{state.error}</FieldError>}

          <div>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "注册中..." : "注册"}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              已有账户？{" "}
              <Link
                to="/signIn"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                立即登录
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
