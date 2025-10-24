import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useActionState } from "react";
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
import checkAuth from "@/utils/checkAuth";

export const Route = createFileRoute("/signUp")({
  component: SignUpPage,
  beforeLoad: checkAuth,
});

function SignUpPage() {
  const navigate = useNavigate();

  const [state, formAction, isPending] = useActionState(
    async (prevState: { error?: string }, formData: FormData) => {
      const result = await signUpAction(prevState, formData);

      // 如果注册成功，跳转到首页
      if (!result.error) {
        navigate({ to: "/" });
      }

      return result;
    },
    { error: undefined }
  );

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
              <FieldLabel htmlFor="avatar">头像 *</FieldLabel>
              <Input
                id="avatar"
                name="avatar"
                type="url"
                required
                placeholder="https://example.com/avatar.jpg"
              />
              <FieldDescription>
                请提供一个头像图片的 URL
                地址，例如：https://example.com/avatar.jpg
              </FieldDescription>
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
              <a
                href="/signIn"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                立即登录
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
