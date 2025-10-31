import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@workspace/ui/components/resizable";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { ContactHeader } from "@/components/ContactHeader";
import { ContactFriends } from "@/components/ContactFriends";
import { ContactGroups } from "@/components/ContactGroups";
import { ContactDetailsPlaceholder } from "@/components/ContactDetailsPlaceholder";
import { useFriends } from "@/queries/friends";
import { useGroups } from "@/queries/groups";

export const Route = createFileRoute("/_authenticated/contacts")({
  component: ContactsPage,
});

function ContactsPage() {
  const navigate = useNavigate();
  const { data: contacts, isLoading: isLoadingFriends } = useFriends();
  const { data: groups, isLoading: isLoadingGroups } = useGroups();
  const [searchQuery, setSearchQuery] = useState("");

  // 处理点击好友
  const handleContactClick = (contactId: string) => {
    navigate({
      to: "/messages/$chatId",
      params: { chatId: `friend-${contactId}` },
    });
  };

  // 处理点击群组
  const handleGroupClick = (groupId: string) => {
    navigate({
      to: "/messages/$chatId",
      params: { chatId: `group-${groupId}` },
    });
  };

  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={25} minSize={20} maxSize={30}>
          <div className="h-full border-r bg-background">
            <div className="p-4 h-full">
              <h2 className="text-lg font-semibold mb-4">联系人</h2>
              <div className="h-full flex flex-col gap-2">
                <ContactHeader
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />

                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-6">
                    <ContactFriends
                      contacts={contacts}
                      isLoading={isLoadingFriends}
                      onContactClick={handleContactClick}
                      searchQuery={searchQuery}
                    />

                    <ContactGroups
                      groups={groups}
                      isLoading={isLoadingGroups}
                      onGroupClick={handleGroupClick}
                      searchQuery={searchQuery}
                    />
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={75} minSize={30}>
          <ContactDetailsPlaceholder />
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
