import { ThreadPrimitive } from "@assistant-ui/react";
import { ArrowDownIcon } from "lucide-react";
import type { FC, MouseEvent } from "react";
import { TooltipIconButton } from "../messages/tooltip-icon-button";

export const ThreadScrollToBottom: FC = () => {
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    const scrollableParent = event.currentTarget.closest(".overflow-y-scroll");
    if (!scrollableParent) return;

    scrollableParent.scrollTo({
      top: scrollableParent.scrollHeight,
      behavior: "smooth",
    });
  };

  return (
    <div className="sticky bottom-0 mt-3 flex w-full flex-col items-center justify-end rounded-t-lg bg-inherit pb-4">
      <ThreadPrimitive.ScrollToBottom asChild>
        <TooltipIconButton
          tooltip="Scroll to bottom"
          variant="outline"
          className="dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
          onClick={handleClick}
        >
          <ArrowDownIcon />
        </TooltipIconButton>
      </ThreadPrimitive.ScrollToBottom>
    </div>
  );
};
