import { authClient } from "../lib/auth-client";

export const useAuth = () => {
  const session = authClient.useSession();
  
  return {
    user: session.data?.user,
    session: session.data,
    isPending: session.isPending,
    error: session.error,
    signIn: authClient.signIn.email,
    signUp: authClient.signUp.email,
    signOut: authClient.signOut,
    getSession: authClient.getSession,
  };
};
