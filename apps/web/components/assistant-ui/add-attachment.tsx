"use client";

import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { useAppendAttachments } from "@/hooks/use-attachments";
import { ComposerPrimitive } from "@assistant-ui/react";
import { PlusIcon } from "lucide-react";
import { useCallback, type FC } from "react";
import { Button } from "../ui/button";
import { AttachmentUI } from "./message-attachments";

export const ComposerAttachments: FC = () => {
  return (
    <div className="aui-composer-attachments mb-2 flex w-full flex-row items-center gap-2 overflow-x-auto px-1.5 pt-0.5 pb-1 empty:hidden">
      <ComposerPrimitive.Attachments
        components={{ Attachment: AttachmentUI }}
      />
    </div>
  );
};

export const ComposerAddAttachment: FC = () => {
  const onClick = useComposerAddAttachment();

  return (
    <Button asChild onClick={onClick}>
      <TooltipIconButton
        tooltip="Add Attachment"
        side="bottom"
        variant="ghost"
        size="icon"
        className="aui-composer-add-attachment size-[34px] rounded-full p-1 text-xs font-semibold hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30"
        aria-label="Add Attachment"
      >
        <PlusIcon className="aui-attachment-add-icon size-5 stroke-[1.5px]" />
      </TooltipIconButton>
    </Button>
  );
};

const useComposerAddAttachment = ({
  multiple = true,
}: {
  /** allow selecting multiple files */
  multiple?: boolean | undefined;
} = {}) => {
  const append = useAppendAttachments();

  const callback = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = multiple;
    input.hidden = true;

    // TODO: calculate this based on loaded models
    const attachmentAccept = "image/*"; // api.composer().getState().attachmentAccept;
    // if (attachmentAccept !== "*") {
    input.accept = attachmentAccept;
    // }

    document.body.appendChild(input);

    input.onchange = (e) => {
      const fileList = (e.target as HTMLInputElement).files;
      if (!fileList) return;
      // for (const file of fileList) {
      //   api.composer().addAttachment(file);
      // }
      void append(fileList);

      document.body.removeChild(input);
    };

    input.oncancel = () => {
      if (!input.files || input.files.length === 0) {
        document.body.removeChild(input);
      }
    };

    input.click();
  }, [append, multiple]);

  return callback;
};
