import { createFileRoute } from "@tanstack/react-router";
import { AssistantChat } from "@/components/AssistantChat";

export const Route = createFileRoute("/_authenticated/assistant")({
  component: AssistantPage,
});

function AssistantPage() {
  return (
    <div className="flex h-full w-full flex-col">
      <AssistantChat />
    </div>
  );
}

