import { useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Loader2, Users } from "lucide-react";
import { OnlineStatusIndicator } from "@/components/OnlineStatusIndicator";
import type { User } from "@workspace/database";

interface ContactFriendsProps {
  contacts: User[] | undefined;
  isLoading: boolean;
  onContactClick: (contactId: string) => void;
  searchQuery: string;
}

export function ContactFriends({
  contacts,
  isLoading,
  onContactClick,
  searchQuery,
}: ContactFriendsProps) {
  // 过滤好友
  const filteredContacts = contacts?.filter((contact) => {
    const query = searchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query) ||
      (contact.code && contact.code.includes(query))
    );
  });

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">
        我的好友 ({filteredContacts?.length || 0})
      </h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : filteredContacts && filteredContacts.length > 0 ? (
        <div className="space-y-2">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => onContactClick(contact.id)}
              className="block p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={contact.image || undefined} />
                    <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <OnlineStatusIndicator
                    userId={contact.id}
                    className="absolute -bottom-0.5 -right-0.5"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">
                    {contact.name}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {contact.email}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无好友</p>
          <p className="text-xs">点击上方按钮添加好友</p>
        </div>
      )}
    </div>
  );
}
