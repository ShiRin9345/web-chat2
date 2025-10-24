import { authClient } from "../lib/auth-client";

export async function signUpAction(
  _prevState: { error?: string },
  formData: FormData
) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;
    const avatar = formData.get("avatar") as string;

    // 验证头像 URL
    if (!avatar || !isValidUrl(avatar)) {
      return { error: "请提供一个有效的头像 URL" };
    }

    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name,
      image: avatar, // Better Auth 使用 image 字段
    });

    if (error) {
      return { error: error.message || "注册失败" };
    }

    if (data) {
      // 如果注册成功，更新用户的头像
      if (avatar && data.user) {
        try {
          await authClient.updateUser({
            image: avatar,
          });
        } catch (updateError) {
          console.warn("更新用户头像失败:", updateError);
        }
      }
      return { error: undefined };
    }

    return { error: "注册失败" };
  } catch (err) {
    return { error: "注册过程中发生错误" };
  }
}

// 简单的 URL 验证函数
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

export async function signInAction(
  _prevState: { error?: string },
  formData: FormData
) {
  try {
    const { data, error } = await authClient.signIn.email({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });

    if (error) {
      return { error: error.message || "登录失败" };
    }

    if (data) {
      return { error: undefined };
    }

    return { error: "登录失败" };
  } catch (err) {
    return { error: "登录过程中发生错误" };
  }
}
