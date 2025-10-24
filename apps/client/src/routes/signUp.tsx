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

export const Route = createFileRoute("/signUp")({
  component: SignUpPage,
});

function SignUpPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await signUp({
        email,
        password,
        name,
      });

      if (error) {
        setError(error.message || "注册失败");
      } else if (data) {
        // 注册成功，跳转到首页
        navigate({ to: "/" });
      }
    } catch (err) {
      setError("注册过程中发生错误");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">注册账户</h1>
          <p className="mt-2 text-sm text-gray-600">创建你的 Web Chat 账户</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">姓名</FieldLabel>
              <Input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="new-password"
              />
              <FieldDescription>密码至少需要 6 个字符</FieldDescription>
            </Field>
          </FieldGroup>

          {error && <FieldError>{error}</FieldError>}

          <div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "注册中..." : "注册"}
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
