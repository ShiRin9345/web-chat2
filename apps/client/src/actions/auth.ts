import { authClient } from "@/lib/auth-client";

export async function signUpAction(
  _prevState: { error?: string },
  formData: FormData
) {
  try {
    const { data, error } = await authClient.signUp.email({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      name: formData.get("name") as string,
      image: formData.get("avatar") as string,
    });

    if (error) {
      return { error: error.message || "注册失败" };
    }

    if (data) {
      return { error: undefined };
    }

    return { error: "注册失败" };
  } catch (err) {
    return { error: "注册过程中发生错误" };
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

export async function updateUserProfile(data: {
  name: string;
  image?: string;
}) {
  try {
    const { data: result, error } = await authClient.updateUser({
      name: data.name,
      image: data.image,
    });

    if (error) {
      throw new Error(error.message || "更新失败");
    }

    return result;
  } catch (err) {
    throw new Error("更新用户信息失败");
  }
}
