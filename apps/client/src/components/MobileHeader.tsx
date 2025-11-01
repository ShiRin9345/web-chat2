import { ModeToggle } from "@/components/mode-toggle";
import { UserProfilePopover } from "@/components/UserProfilePopover";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { authClient } from "@/lib/auth-client";

export function MobileHeader() {
  const { data: session } = authClient.useSession();

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center h-full px-4 gap-2 w-full">
        <UserProfilePopover>
          <button className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session?.user?.image || undefined} />
              <AvatarFallback>
                {session?.user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </button>
        </UserProfilePopover>
        <div className="flex-1" />
        <ModeToggle />
      </div>
    </header>
  );
}

