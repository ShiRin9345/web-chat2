import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import checkAuth from "@/utils/checkAuth";

export const Route = createFileRoute("/")({
  component: App,
  beforeLoad: checkAuth,
});

function App() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/signIn" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              欢迎来到 Web Chat
            </h1>

            {isPending ? (
              <div className="text-center py-4">
                <p className="text-gray-500">加载中...</p>
              </div>
            ) : session?.user ? (
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <h2 className="text-lg font-medium text-gray-900">
                    用户信息
                  </h2>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-3">
                      {session.user.image && (
                        <img
                          src={session.user.image}
                          alt={session.user.name || session.user.email}
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {session.user.name || "未设置姓名"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {session.user.email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    登出
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">未登录</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
