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
import { Loader2, User } from "lucide-react";
import { useRef, useState } from "react";
import { z } from "zod";
import uploadAvatarToOSS from "@/utils/uploadAvatar";
import { signUpAction } from "@/actions/auth";

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
  const selectedFileRef = useRef<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        if (!selectedFileRef.current) {
          alert("请选择头像");
          return;
        }

        // 上传头像到 OSS
        const avatarUrl = await uploadAvatarToOSS(selectedFileRef.current);

        // 创建 FormData 并添加头像 URL
        const formData = new FormData();
        formData.set("name", value.name);
        formData.set("email", value.email);
        formData.set("password", value.password);
        formData.set("avatar", avatarUrl);

        // 调用注册 API
        const result = await signUpAction({ error: undefined }, formData);

        if (result.error) {
          alert(result.error);
        } else {
          navigate({ to: "/" });
        }
      } catch (error) {
        console.error(error);
        alert("注册失败，请重试");
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

      selectedFileRef.current = file;
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
                    placeholder="请输入你的姓名"
                    autoComplete="name"
                  />
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
                    placeholder="请输入邮箱地址"
                    autoComplete="email"
                  />
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
                    placeholder="请输入密码"
                    autoComplete="new-password"
                  />
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
                <div
                  className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer overflow-hidden relative"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="头像预览"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <User className="w-8 h-8 text-gray-400" />
                      <span className="text-xs mt-1">点击上传</span>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="size-0 invisible"
                />

                {selectedFileRef.current && (
                  <div className="text-sm text-blue-600">✓ 已选择头像 </div>
                )}
              </div>

              <FieldDescription>
                点击上方圆形区域选择头像图片，支持 JPG、PNG 格式，大小不超过 5MB
              </FieldDescription>
            </Field>
          </FieldGroup>

          <div>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    "注册"
                  )}
                </Button>
              )}
            </form.Subscribe>
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
