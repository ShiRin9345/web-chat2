import { authClient } from "@/lib/auth-client";
import OSS from "ali-oss";

export default async function uploadAvatarToOSS(file: File): Promise<string> {
  const session = await authClient.getSession();
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

  const client = new OSS({
    bucket: "shirin-123",
    region: "oss-cn-beijing",
    accessKeyId: credentials.AccessKeyId,
    accessKeySecret: credentials.AccessKeySecret,
    stsToken: credentials.SecurityToken,
  });

  const fileName = `avatars/${session?.data?.user.id}-${file.name}`;
  const result = await client.put(fileName, file);
  return result.url;
}
