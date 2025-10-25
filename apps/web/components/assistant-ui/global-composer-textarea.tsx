"use client";

import { useTranslations } from "next-intl";
import type { ClipboardEvent, KeyboardEvent } from "react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { toast } from "sonner";

import { useAppendAttachments } from "@/hooks/use-attachments";
import { useComposerPrompt } from "@/hooks/use-composer-prompt";
import { useModelsValue } from "@/hooks/use-models";
import { usePanelsConfigValue } from "@/hooks/use-panels";
import { useOpenSignIn, useUser } from "@/lib/auth-client";

interface AttachmentCapabilityState {
  allowed: boolean;
  blockingModels: string[];
}

const formatModelNames = (
  names: string[],
  t: ReturnType<typeof useTranslations>
) => {
  if (!names.length) return t("selectedModels");
  return names.map((name) => `• ${name}`).join("\n");
};

export type GlobalComposerTextareaHandle = {
  focus: () => void;
  submit: () => Promise<boolean>;
};

type GlobalComposerTextareaProps = {
  placeholder: string;
  onSubmit: (value: string) => Promise<boolean>;
};

export const GlobalComposerTextarea = forwardRef<
  GlobalComposerTextareaHandle,
  GlobalComposerTextareaProps
>(({ placeholder, onSubmit }, ref) => {
  const t = useTranslations("ComposerAddAttachment");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [prompt, setPrompt] = useComposerPrompt();
  const appendAttachments = useAppendAttachments();
  const openSignIn = useOpenSignIn();
  const user = useUser();
  const isLoggedIn = !!user;
  const panels = usePanelsConfigValue();
  const panelModelIds = useMemo(
    () => panels.map((panel) => panel.model),
    [panels]
  );
  const { models } = useModelsValue({ includeModels: panelModelIds });

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

  const disabledImageMessage = attachmentsCapabilities.image.allowed
    ? undefined
    : `${t(
        attachmentsCapabilities.image.blockingModels.length === 1
          ? "imageCapabilitySingle"
          : "imageCapabilityPlural"
      )}${formatModelNames(attachmentsCapabilities.image.blockingModels, t)}`;

  const disabledPdfMessage = attachmentsCapabilities.pdf.allowed
    ? undefined
    : `${t(
        attachmentsCapabilities.pdf.blockingModels.length === 1
          ? "pdfCapabilitySingle"
          : "pdfCapabilityPlural"
      )}${formatModelNames(attachmentsCapabilities.pdf.blockingModels, t)}`;

  const handleSubmit = useCallback(async (): Promise<boolean> => {
    const success = await onSubmit(prompt);
    if (success) {
      setPrompt("");
    }
    return success;
  }, [onSubmit, prompt, setPrompt]);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight + 2}px`;
  }, []);

  useLayoutEffect(() => {
    resizeTextarea();
  }, [prompt, resizeTextarea]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        textareaRef.current?.focus();
      },
      submit: handleSubmit,
    }),
    [handleSubmit]
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const files = event.clipboardData?.files;
      if (!files || files.length === 0) {
        return;
      }

      if (!isLoggedIn) {
        event.preventDefault();
        openSignIn();
        return;
      }

      const hasBlockedImage = Array.from(files).some(
        (file) =>
          file.type.startsWith("image/") &&
          !attachmentsCapabilities.image.allowed
      );

      if (hasBlockedImage) {
        event.preventDefault();
        toast.error(disabledImageMessage ?? t("imageCapabilityPlural"));
        return;
      }

      const hasBlockedPdf = Array.from(files).some(
        (file) =>
          file.type === "application/pdf" &&
          !attachmentsCapabilities.pdf.allowed
      );

      if (hasBlockedPdf) {
        event.preventDefault();
        toast.error(disabledPdfMessage ?? t("pdfCapabilityPlural"));
        return;
      }

      event.preventDefault();
      void appendAttachments(files);
    },
    [
      appendAttachments,
      attachmentsCapabilities.image.allowed,
      attachmentsCapabilities.pdf.allowed,
      disabledImageMessage,
      disabledPdfMessage,
      isLoggedIn,
      openSignIn,
      t,
    ]
  );

  return (
    <textarea
      placeholder={placeholder}
      name="global-composer"
      autoFocus
      className="bg-muted border-border dark:border-muted-foreground/15 focus:outline-primary placeholder:text-muted-foreground max-h-[calc(50dvh)] min-h-[2.5rem] w-full resize-none rounded-t-2xl border-x border-t px-3 py-2 text-base outline-none"
      rows={1}
      value={prompt}
      onChange={(event) => setPrompt(event.target.value)}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      ref={textareaRef}
    />
  );
});

GlobalComposerTextarea.displayName = "GlobalComposerTextarea";
