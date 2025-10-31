import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Plus, MessageSquare, Search } from "lucide-react";
import { useDialogStore } from "@/stores/dialog";

interface ConversationHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ConversationHeader({
  searchQuery,
  onSearchChange,
}: ConversationHeaderProps) {
  const { openDialog } = useDialogStore();

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索会话..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => openDialog("addFriend")}
          className="w-10 h-10 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => openDialog("createGroup")}
          className="w-10 h-10 p-0"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
