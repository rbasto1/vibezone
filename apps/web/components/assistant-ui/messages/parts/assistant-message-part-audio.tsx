import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";

import { createObjectUrl } from "@/lib/object-url";
import {
  useAssistantState,
  type MessagePartState,
  type Unstable_AudioMessagePart,
} from "@assistant-ui/react";

const useMessagePartAudio = () => {
  return useAssistantState(({ part }) => {
    if (part.type !== "audio")
      throw new Error(
        "MessagePartAudio can only be used inside audio message parts."
      );

    return part as MessagePartState & Unstable_AudioMessagePart;
  });
};

export const Audio: FC = () => {
  const audioPart = useMessagePartAudio();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const mimeType =
      audioPart.audio.format === "wav" ? "audio/wav" : "audio/mpeg";
    const objectUrl = createObjectUrl(audioPart.audio.data, mimeType);
    setUrl(objectUrl);

    if (
      !objectUrl ||
      objectUrl.startsWith("http") ||
      objectUrl.startsWith("data:")
    )
      return () => undefined;

    return () => URL.revokeObjectURL(objectUrl);
  }, [audioPart.audio.data, audioPart.audio.format]);

  const statusLabel = useMemo(() => {
    if (audioPart.status.type === "running") return "Generating audio...";
    if (audioPart.status.type === "incomplete")
      return "Audio generation failed";
    return null;
  }, [audioPart.status]);

  return (
    <div className="aui-assistant-audio mt-4 inline-flex flex-col gap-2 rounded-lg border border-border/40 bg-muted/25 p-3 text-muted-foreground/80">
      <audio
        className="w-full"
        controls
        preload="none"
        src={url ?? undefined}
        aria-label="Assistant generated audio"
      />
      {statusLabel ? (
        <span className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground/70">
          {statusLabel}
        </span>
      ) : null}
    </div>
  );
};
