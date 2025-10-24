import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { signInAction } from "@/actions/auth";

export const Route = createFileRoute("/signIn")({
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();

  const [state, formAction, isPending] = useActionState(
    async (prevState: { error?: string }, formData: FormData) => {
      const result = await signInAction(prevState, formData);

      // 如果登录成功，跳转到首页
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
          <h1 className="text-3xl font-bold text-gray-900">登录账户</h1>
          <p className="mt-2 text-sm text-gray-600">登录到你的 Web Chat 账户</p>
        </div>

        <form className="mt-8 space-y-6" action={formAction}>
          <FieldGroup>
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
              <FieldDescription>请输入你注册时使用的邮箱地址</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="password">密码</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="请输入密码"
                autoComplete="current-password"
              />
              <FieldDescription>请输入你的账户密码</FieldDescription>
            </Field>
          </FieldGroup>

          {state.error && <FieldError>{state.error}</FieldError>}

          <div>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "登录中..." : "登录"}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              还没有账户？{" "}
              <Link
                to="/signUp"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                立即注册
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
