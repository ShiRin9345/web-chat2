import { authClient } from "@/lib/auth-client";
import OSS from "ali-oss";
import axios from "axios";

async function getSTSToken() {
  try {
    const response = await axios.get(
      "http://localhost:3001/api/oss/get_sts_token_for_oss_upload"
    );

    const credentials = response.data;
    return {
      accessKeyId: credentials.AccessKeyId,
      accessKeySecret: credentials.AccessKeySecret,
      stsToken: credentials.SecurityToken,
    };
  } catch (error) {
    throw new Error(`获取STS令牌失败: ${error}`);
  }
}

export default async function uploadAvatarToOSS(file: File): Promise<string> {
  const session = await authClient.getSession();

  const initialCredentials = await getSTSToken();

  const client = new OSS({
    bucket: "shirin-123",
    region: "oss-cn-beijing",
    accessKeyId: initialCredentials.accessKeyId,
    accessKeySecret: initialCredentials.accessKeySecret,
    stsToken: initialCredentials.stsToken,
    // 配置 STS token 自动刷新
    refreshSTSToken: getSTSToken,
    refreshSTSTokenInterval: 300000, // 5分钟刷新一次
  });

  const fileName = `avatars/${session?.data?.user.id}-${file.name}`;
  const result = await client.put(fileName, file);
  return result.url;
}
