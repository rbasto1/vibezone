"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAttachmentSrc } from "@/hooks/use-attachments";
import type { Attachment } from "@assistant-ui/react";
import type { PropsWithChildren } from "react";
import { useState, type FC } from "react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

interface AttachmentPreviewDialogProps extends PropsWithChildren {
  attachment: Attachment;
  className?: string;
}

export const AttachmentPreviewDialog: FC<AttachmentPreviewDialogProps> = ({
  children,
  attachment,
  className,
}) => {
  const src = useAttachmentSrc(attachment);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!src) return children;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <Button
        className={cn(
          "cursor-pointer transition-colors hover:bg-accent/50",
          className
        )}
        onClick={() => setDialogOpen(true)}
      >
        {children}
      </Button>
      <DialogContent className="aui-attachment-preview-dialog-content p-2 sm:max-w-3xl [&_svg]:text-background [&>button]:rounded-full [&>button]:bg-foreground/60 [&>button]:p-1 [&>button]:opacity-100 [&>button]:!ring-0 [&>button]:hover:[&_svg]:text-destructive">
        <DialogTitle className="aui-sr-only sr-only">
          Image Attachment Preview
        </DialogTitle>
        <div className="aui-attachment-preview relative mx-auto flex max-h-[80dvh] w-full items-center justify-center overflow-hidden bg-background">
          <AttachmentPreview src={src} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface AttachmentPreviewProps {
  src: string;
}

const AttachmentPreview: FC<AttachmentPreviewProps> = ({ src }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Image Preview"
      className={
        isLoaded
          ? "aui-attachment-preview-image-loaded block h-auto max-h-[80vh] w-auto max-w-full object-contain"
          : "aui-attachment-preview-image-loading hidden"
      }
      onLoad={() => setIsLoaded(true)}
    />
  );
};
