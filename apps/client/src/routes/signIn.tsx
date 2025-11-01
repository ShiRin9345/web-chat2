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
import { BubbleBackground } from "@workspace/ui/components/bubble-background";
import { signInAction } from "@/actions/auth";

export const Route = createFileRoute("/signIn")({
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();

  const [state, formAction, isPending] = useActionState(
    async (prevState: { error?: string }, formData: FormData) => {
      const result = await signInAction(prevState, formData);

      if (!result.error) {
        navigate({ to: "/" });
      }

      return result;
    },
    { error: undefined }
  );

  return (
    <BubbleBackground className="min-h-screen" interactive>
      <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-background/80 backdrop-blur-sm rounded-lg p-8 shadow-lg border border-border/50">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">登录账户</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              登录到你的 Web Chat 账户
            </p>
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
                <FieldDescription>
                  请输入你注册时使用的邮箱地址
                </FieldDescription>
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
              <p className="text-sm text-muted-foreground">
                还没有账户？{" "}
                <Link
                  to="/signUp"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  立即注册
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </BubbleBackground>
  );
}
