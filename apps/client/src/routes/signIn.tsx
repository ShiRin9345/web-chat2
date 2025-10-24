import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@workspace/ui/components/field";

export const Route = createFileRoute("/signIn")({
  component: SignInPage,
});

function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await signIn({
        email,
        password,
      });

      if (error) {
        setError(error.message || "登录失败");
      } else if (data) {
        // 登录成功，跳转到首页
        navigate({ to: "/" });
      }
    } catch (err) {
      setError("登录过程中发生错误");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">登录账户</h1>
          <p className="mt-2 text-sm text-gray-600">登录到你的 Web Chat 账户</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">邮箱地址</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
              <FieldDescription>请输入你的账户密码</FieldDescription>
            </Field>
          </FieldGroup>

          {error && <FieldError>{error}</FieldError>}

          <div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "登录中..." : "登录"}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              还没有账户？{" "}
              <a
                href="/signUp"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                立即注册
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
