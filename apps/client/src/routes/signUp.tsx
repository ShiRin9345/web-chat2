import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
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
import { useState } from "react";
import { z } from "zod";
import uploadAvatarToOSS from "@/utils/uploadAvatar";

// Zod 验证模式
const signUpSchema = z.object({
  name: z
    .string()
    .min(2, "姓名至少需要2个字符")
    .max(50, "姓名不能超过50个字符"),
  email: z.email("请输入有效的邮箱地址"),
  password: z
    .string()
    .min(6, "密码至少需要6个字符")
    .max(100, "密码不能超过100个字符"),
});

export const Route = createFileRoute("/signUp")({
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    validators: {
      onBlur: signUpSchema,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);

      try {
        // 检查头像是否已选择
        if (!selectedFile) {
          alert("请选择头像");
          return;
        }

        let avatarUrl = "";

        // 上传头像到 OSS
        avatarUrl = await uploadAvatarToOSS(selectedFile);

        // 创建 FormData 并添加头像 URL
        const formData = new FormData();
        formData.set("name", value.name);
        formData.set("email", value.email);
        formData.set("password", value.password);
        formData.set("avatar", avatarUrl);

        const result = await signUpAction({ error: undefined }, formData);

        if (result.error) {
          alert(result.error);
        } else {
          navigate({ to: "/" });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("请选择图片文件");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("图片大小不能超过 5MB");
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="mt-8 space-y-6"
        >
          <FieldGroup>
            <form.Field
              name="name"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>姓名</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="请输入你的姓名"
                    autoComplete="name"
                  />
                  <FieldDescription>这将显示在你的个人资料中</FieldDescription>
                  {field.state.meta.errors.length > 0 && (
                    <FieldError>
                      {field.state.meta.errors[0]?.message ||
                        String(field.state.meta.errors[0])}
                    </FieldError>
                  )}
                </Field>
              )}
            />

            <form.Field
              name="email"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>邮箱地址</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="请输入邮箱地址"
                    autoComplete="email"
                  />
                  <FieldDescription>我们将使用此邮箱与你联系</FieldDescription>
                  {field.state.meta.errors.length > 0 && (
                    <FieldError>
                      {field.state.meta.errors[0]?.message ||
                        String(field.state.meta.errors[0])}
                    </FieldError>
                  )}
                </Field>
              )}
            />

            <form.Field
              name="password"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>密码</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="请输入密码"
                    autoComplete="new-password"
                  />
                  <FieldDescription>密码至少需要 6 个字符</FieldDescription>
                  {field.state.meta.errors.length > 0 && (
                    <FieldError>
                      {field.state.meta.errors[0]?.message ||
                        String(field.state.meta.errors[0])}
                    </FieldError>
                  )}
                </Field>
              )}
            />

            <Field>
              <FieldLabel>头像 *</FieldLabel>
              <div className="flex flex-col items-center space-y-4">
                {/* 圆形头像预览/上传区域 */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="头像预览"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <User className="w-8 h-8 text-gray-400" />
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
                  />
                </div>

                {/* 文件选择状态 */}
                {selectedFile && (
                  <div className="text-sm text-blue-600">
                    ✓ 已选择头像，将在注册时上传
                  </div>
                )}
              </div>

              <FieldDescription>
                点击上方圆形区域选择头像图片，支持 JPG、PNG 格式，大小不超过 5MB
              </FieldDescription>
            </Field>
          </FieldGroup>

          <div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "注册中..." : "注册"}
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
