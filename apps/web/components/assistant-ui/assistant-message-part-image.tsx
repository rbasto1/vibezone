"use client";
/* eslint-disable @next/next/no-img-element */
import type { FC } from "react";
import { useState } from "react";

import { cn } from "@/components/ui/utils";
import type {
  ImageMessagePartProps,
  MessagePartStatus,
  ToolCallMessagePartStatus,
} from "@assistant-ui/react";
import { useMessagePartImage } from "@assistant-ui/react";
import { useTranslations } from "next-intl";

type ImageProps = ImagePropsComplete | ImageMessagePartProps;
interface ImagePropsComplete {
  src: string;
  status: MessagePartStatus | ToolCallMessagePartStatus;
  filename?: string;
}

function ImageFromState() {
  const imagePart = useMessagePartImage();
  const source = imagePart.image;

  return (
    <Image
      src={source}
      status={imagePart.status}
      filename={imagePart.filename}
    />
  );
}

// const source = useMemo(() => {
//   const value = imagePart.image.trim();
//   if (
//     value.startsWith("data:") ||
//     value.startsWith("http") ||
//     value.startsWith("blob:")
//   ) {
//     return value;
//   }

//   return `data:image/png;base64,${value}`;
// }, [imagePart.image]);

export const Image: FC<ImageProps> = (props) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const t = useTranslations("AssistantMessageImage");

  if (!("src" in props)) {
    // When the LLM responds with an image, it appears that the correct adapter is used
    // so we can pass it to the original implementation that uses useMessagePartImage
    return <ImageFromState />;
  }

  // When the thread was loaded from the backend, we have instead a "file" data part that
  // has an image in it, and so we need to allow the <File /> component to call us with the
  // parsed image info
  const { src, status, filename } = props;

  return (
    <figure className="aui-assistant-image mt-2 inline-flex max-w-full flex-col">
      <div className="relative overflow-hidden rounded-xl border border-border/40 bg-muted/40">
        <img
          src={src}
          className={cn(
            "block max-h-[24rem] w-full object-contain transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            status.type === "running" && !isLoaded ? "animate-pulse" : null
          )}
          onLoad={() => setIsLoaded(true)}
        />
        {!isLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/70">
            {t("loading")}
          </div>
        ) : null}
      </div>
      {filename ? (
        <figcaption className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground/70">
          {filename}
        </figcaption>
      ) : null}
    </figure>
  );
};
