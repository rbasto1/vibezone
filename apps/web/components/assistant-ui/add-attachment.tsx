"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/components/ui/utils";
import { useAppendAttachments } from "@/hooks/use-attachments";
import { useModelsValue } from "@/hooks/use-models";
import { usePanelsConfigValue } from "@/hooks/use-panels";
import { useSession } from "@/hooks/use-session";
import { ComposerPrimitive } from "@assistant-ui/react";
import { PlusIcon } from "lucide-react";
import { Fragment, useCallback, useMemo, type FC } from "react";
import { FaFileAlt, FaFileImage, FaFilePdf } from "react-icons/fa";
import type { IconType } from "react-icons/lib";
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

interface AttachmentCapabilityState {
  allowed: boolean;
  blockingModels: string[];
}

interface AttachmentMenuItemConfig {
  id: "text" | "image" | "pdf";
  label: string;
  icon: IconType;
  onSelect: () => void;
  disabled: boolean;
  disabledReason?: string;
}

const formatModelNames = (names: string[]) => {
  if (names.length === 0) return "Selected models";
  return names.map((name) => `• ${name}`).join("\n");
};

export const ComposerAddAttachment: FC = () => {
  const panels = usePanelsConfigValue();
  const { models } = useModelsValue();
  const session = useSession();
  const isLoggedIn = !!session?.user;

  const attachmentsCapabilities = useMemo(() => {
    const modelsMap = new Map(models.map((model) => [model.id, model]));
    const imageBlocked = new Set<string>();
    const pdfBlocked = new Set<string>();

    panels.forEach((panel) => {
      const model = modelsMap.get(panel.model);
      if (!model) return;
      if (!model.capVision) {
        imageBlocked.add(model.name);
      }
      if (!model.capPdf) {
        pdfBlocked.add(model.name);
      }
    });

    return {
      image: {
        allowed: imageBlocked.size === 0,
        blockingModels: Array.from(imageBlocked),
      } satisfies AttachmentCapabilityState,
      pdf: {
        allowed: pdfBlocked.size === 0,
        blockingModels: Array.from(pdfBlocked),
      } satisfies AttachmentCapabilityState,
    };
  }, [models, panels]);

  const openTextPicker = useComposerAddAttachment(
    ["text/*", "application/json"].join(",")
  );
  const openImagePicker = useComposerAddAttachment("image/*");
  const openPdfPicker = useComposerAddAttachment("application/pdf");

  const disabledImageMessage = attachmentsCapabilities.image.allowed
    ? undefined
    : `The following model${attachmentsCapabilities.image.blockingModels.length === 1 ? " is" : "s are"} not capable of interpreting images:
    ${formatModelNames(attachmentsCapabilities.image.blockingModels)}`;

  const disabledPdfMessage = attachmentsCapabilities.pdf.allowed
    ? undefined
    : `The following model${attachmentsCapabilities.pdf.blockingModels.length === 1 ? " is" : "s are"} not capable of reading PDF files:
    ${formatModelNames(attachmentsCapabilities.pdf.blockingModels)}`;

  const menuItems: AttachmentMenuItemConfig[] = [
    {
      id: "text",
      label: "Attach text document",
      icon: FaFileAlt,
      onSelect: openTextPicker,
      disabled: false,
    },
    {
      id: "image",
      label: "Attach image",
      icon: FaFileImage,
      onSelect: openImagePicker,
      disabled: !attachmentsCapabilities.image.allowed,
      disabledReason: disabledImageMessage,
    },
    {
      id: "pdf",
      label: "Attach PDF",
      icon: FaFilePdf,
      onSelect: openPdfPicker,
      disabled: !attachmentsCapabilities.pdf.allowed,
      disabledReason: disabledPdfMessage,
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className="aui-composer-add-attachment size-[34px] rounded-full p-1 text-xs font-semibold hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30"
          aria-label="Add Attachment"
        >
          <PlusIcon className="aui-attachment-add-icon size-5 stroke-[1.5px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {menuItems.map((item) => {
          const content = (
            <DropdownMenuItem
              onSelect={(event) => {
                if (item.disabled) {
                  event.preventDefault();
                  event.stopPropagation();
                  return;
                }
                if (!isLoggedIn) {
                  event.preventDefault();
                  event.stopPropagation();
                  try {
                    window.dispatchEvent(new Event("vz:open-login"));
                  } catch {
                    /* ignore */
                  }
                  return;
                }
                item.onSelect();
              }}
              aria-disabled={item.disabled}
              className={cn(
                "flex items-center gap-2 text-sm",
                item.disabled &&
                  "cursor-not-allowed opacity-60 focus:bg-transparent focus:text-muted-foreground"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
            </DropdownMenuItem>
          );

          if (!item.disabledReason) {
            return <Fragment key={item.id}>{content}</Fragment>;
          }

          return (
            <Tooltip key={item.id} delayDuration={100}>
              <TooltipTrigger asChild>{content}</TooltipTrigger>
              <TooltipContent side="right" align="center">
                {item.disabledReason.split("\n").map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const useComposerAddAttachment = (accept: string) => {
  const append = useAppendAttachments();

  const callback = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.hidden = true;
    input.multiple = true;
    input.accept = accept;

    document.body.appendChild(input);

    input.onchange = (e) => {
      const fileList = (e.target as HTMLInputElement).files;
      if (!fileList) return;
      void append(fileList);

      document.body.removeChild(input);
    };

    input.oncancel = () => {
      if (!input.files || input.files.length === 0) {
        document.body.removeChild(input);
      }
    };

    input.click();
  }, [append, accept]);

  return callback;
};
