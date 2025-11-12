"use client";

import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useMemo, type FC } from "react";
import { FaFileAlt, FaFileImage, FaFilePdf } from "react-icons/fa";
import type { IconType } from "react-icons/lib";

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
import {
  MAX_ATTACHMENTS,
  useAppendAttachments,
  useAttachmentsValue,
  useRemoveAttachment,
} from "@/hooks/use-attachments";
import { useModelsValue } from "@/hooks/use-models";
import { usePanelsConfigValue } from "@/hooks/use-panels";
import { useOpenSignIn, useUser } from "@/lib/auth-client";
import { AttachmentChip } from "./attachment-chip";

export const ComposerAttachments: FC = () => {
  const attachments = useAttachmentsValue();
  const removeAttachment = useRemoveAttachment();

  if (!attachments.length) return null;

  return (
    <div className="aui-composer-attachments mb-2 flex w-full flex-row items-center gap-2 overflow-x-auto px-1.5 pt-0.5 pb-1 empty:hidden">
      {attachments.map((attachment) => (
        <AttachmentChip
          key={attachment.id}
          attachment={attachment}
          onRemove={removeAttachment}
        />
      ))}
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

const formatModelNames = (
  names: string[],
  t: ReturnType<typeof useTranslations>
) => {
  if (!names.length) return t("selectedModels");
  return names.map((name) => `• ${name}`).join("\n");
};

interface ComposerAddAttachmentProps {
  className?: string;
}

export const ComposerAddAttachment: FC<ComposerAddAttachmentProps> = ({
  className,
}) => {
  const t = useTranslations("ComposerAddAttachment");
  const openSignIn = useOpenSignIn();
  const panels = usePanelsConfigValue();
  const attachments = useAttachmentsValue();
  const panelModelIds = useMemo(
    () => panels.map((panel) => panel.model),
    [panels]
  );
  const { models } = useModelsValue({ includeModels: panelModelIds });
  const user = useUser();
  const isLoggedIn = !!user;
  const maxAttachmentsReached = attachments.length >= MAX_ATTACHMENTS;

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
    : `${t(attachmentsCapabilities.image.blockingModels.length === 1 ? "imageCapabilitySingle" : "imageCapabilityPlural")}
${formatModelNames(attachmentsCapabilities.image.blockingModels, t)}`;

  const disabledPdfMessage = attachmentsCapabilities.pdf.allowed
    ? undefined
    : `${t(attachmentsCapabilities.pdf.blockingModels.length === 1 ? "pdfCapabilitySingle" : "pdfCapabilityPlural")}
${formatModelNames(attachmentsCapabilities.pdf.blockingModels, t)}`;

  const menuItems: AttachmentMenuItemConfig[] = [
    {
      id: "text",
      label: t("attachTextDocument"),
      icon: FaFileAlt,
      onSelect: openTextPicker,
      disabled: false,
    },
    {
      id: "image",
      label: t("attachImage"),
      icon: FaFileImage,
      onSelect: openImagePicker,
      disabled: !attachmentsCapabilities.image.allowed,
      disabledReason: disabledImageMessage,
    },
    {
      id: "pdf",
      label: t("attachPdf"),
      icon: FaFilePdf,
      onSelect: openPdfPicker,
      disabled: !attachmentsCapabilities.pdf.allowed,
      disabledReason: disabledPdfMessage,
    },
  ];

  const triggerButton = (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8 rounded-full text-xs font-semibold hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30",
        className
      )}
      aria-label="Add Attachment"
      disabled={maxAttachmentsReached}
    >
      <PlusIcon className="aui-attachment-add-icon size-5 stroke-[1.5px]" />
    </Button>
  );

  const dropdownTrigger = (
    <DropdownMenuTrigger asChild disabled={maxAttachmentsReached}>
      {triggerButton}
    </DropdownMenuTrigger>
  );

  return (
    <DropdownMenu>
      {maxAttachmentsReached ? (
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <span className="inline-flex">{dropdownTrigger}</span>
          </TooltipTrigger>
          <TooltipContent side="top">
            {t("maxAttachmentsTooltip", { max: MAX_ATTACHMENTS })}
          </TooltipContent>
        </Tooltip>
      ) : (
        dropdownTrigger
      )}
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
                  openSignIn();
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
