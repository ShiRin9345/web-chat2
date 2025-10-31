import { useEffect } from "react";
import { useConversationsStore } from "@/stores/conversations";
import { authClient } from "@/lib/auth-client";

/**
 * 初始化离线未读消息计数
 * 在应用启动时从服务器恢复离线期间的未读计数
 */
export function useInitializeOfflineUnreads() {
  const { data: session } = authClient.useSession();
  const restoreUnreadCountsFromServer = useConversationsStore(
    (state) => state.restoreUnreadCountsFromServer
  );

  useEffect(() => {
    if (!session?.user?.id) return;

    // 用户登录时，从服务器恢复离线未读计数
    const initializeUnreads = async () => {
      try {
        console.log(
          "[useInitializeOfflineUnreads] Starting to restore unread counts..."
        );
        await restoreUnreadCountsFromServer();
        console.log(
          "[useInitializeOfflineUnreads] Successfully restored unread counts"
        );
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          "[useInitializeOfflineUnreads] Failed to initialize offline unreads:",
          errorMsg
        );
      }
    };

    initializeUnreads();
  }, [session?.user?.id, restoreUnreadCountsFromServer]);

  // 定期同步未读计数到服务器（每5分钟）
  useEffect(() => {
    if (!session?.user?.id) return;

    const syncInterval = setInterval(() => {
      const { syncUnreadCountsToServer } = useConversationsStore.getState();
      syncUnreadCountsToServer().catch((error: unknown) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          "[useInitializeOfflineUnreads] Failed to sync unreads:",
          errorMsg
        );
      });
    }, 5 * 60 * 1000);

    return () => clearInterval(syncInterval);
  }, [session?.user?.id]);

  // 页面关闭或用户离开时，同步未读计数
  useEffect(() => {
    const handleBeforeUnload = () => {
      const { syncUnreadCountsToServer } = useConversationsStore.getState();
      syncUnreadCountsToServer().catch((error: unknown) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          "[useInitializeOfflineUnreads] Failed to sync unreads on unload:",
          errorMsg
        );
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
}
