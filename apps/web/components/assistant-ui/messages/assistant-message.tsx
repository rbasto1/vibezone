import { MessagePrimitive, useAssistantState } from "@assistant-ui/react";
import { motion } from "framer-motion";
import { StarIcon } from "lucide-react";
import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  type FC,
  type RefObject,
} from "react";
import { createRoot, type Root } from "react-dom/client";

import { StopIcon } from "@/components/ui/icons/stop";
import { AssistantActionBar } from "./assistant-action-bar";
import { BranchPicker } from "./branch-picker";
import { MarkdownText } from "./markdown-text";
import { MessageError } from "./message-error";
import { Audio } from "./parts/assistant-message-part-audio";
import { File } from "./parts/assistant-message-part-file";
import { Image } from "./parts/assistant-message-part-image";
import { Reasoning } from "./parts/assistant-message-part-reasoning";
import { Source } from "./parts/assistant-message-part-source";
import { ToolFallback } from "./tool-fallback";

interface AssistantMessageProps {
  threadId: string;
}

export const AssistantMessage: FC<AssistantMessageProps> = ({ threadId }) => {
  const message = useAssistantState(({ message }) => message);
  const showStoppedIndicator =
    message.status?.type === "incomplete" &&
    message.status.reason === "cancelled";
  const contentRef = useRef<HTMLDivElement>(null);
  const stopIconContainerRef = useRef<HTMLSpanElement | null>(null);
  const stopIconRootRef = useRef<Root | null>(null);

  const components = useMemo(
    () => ({
      Text: MarkdownText,
      Reasoning,
      Image,
      File,
      Source,
      Unstable_Audio: Audio,
      tools: { Fallback: ToolFallback },
    }),
    []
  );

  useEffect(() => {
    if (!showStoppedIndicator || !contentRef.current) {
      // Clean up if stop icon exists
      cleanupStopIcon(stopIconRootRef, stopIconContainerRef);
      return;
    }

    const addStopIcon = () => {
      if (!contentRef.current) return;

      // Find the markdown container (div with class "aui-md")
      const markdownContainer = contentRef.current.querySelector(".aui-md");
      if (!markdownContainer) return;

      // Find the last element in the markdown container
      // This could be a <p>, <li>, <h1>, etc.
      const lastElement = Array.from(markdownContainer.children).at(-1) as
        | HTMLElement
        | undefined;

      if (!lastElement) return;

      // Check if icon already exists in this element
      if (lastElement.contains(stopIconContainerRef.current)) {
        return;
      }

      // Clean up existing icon if it exists elsewhere
      const oldRoot = stopIconRootRef.current;
      if (oldRoot) {
        cleanupStopIcon(stopIconRootRef, stopIconContainerRef, oldRoot);
      }

      // Create a container span for the icon
      const container = document.createElement("span");
      container.className = "inline-block align-middle";
      lastElement.appendChild(container);
      stopIconContainerRef.current = container;

      // Create React root and render the StopIcon component
      const root = createRoot(container);
      root.render(
        createElement(StopIcon, {
          className: "text-destructive size-4 ml-1 -mt-1",
          "aria-hidden": "true",
          "aria-label": "Response stopped",
        })
      );
      stopIconRootRef.current = root;
    };

    // Use requestAnimationFrame to ensure we run after React's reconciliation
    const timeoutId = requestAnimationFrame(addStopIcon);

    // Set up MutationObserver to re-add icon if React removes it
    const observer = new MutationObserver(() => {
      if (
        stopIconContainerRef.current &&
        (!stopIconContainerRef.current.parentNode ||
          !contentRef.current?.contains(stopIconContainerRef.current))
      ) {
        // Icon was removed, re-add it
        requestAnimationFrame(addStopIcon);
      }
    });

    if (contentRef.current) {
      observer.observe(contentRef.current, {
        childList: true,
        subtree: true,
      });
    }

    // Cleanup function
    return () => {
      cancelAnimationFrame(timeoutId);
      observer.disconnect();
      cleanupStopIcon(stopIconRootRef, stopIconContainerRef);
    };
  }, [showStoppedIndicator, message.id]);

  return (
    <MessagePrimitive.Root asChild>
      <motion.div
        // aui-assistant-message-root
        className="relative mx-auto grid w-full max-w-[var(--thread-max-width)] grid-cols-[auto_auto_1fr] grid-rows-[auto_1fr] px-[var(--thread-padding-x)] pt-4 pb-10"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role="assistant"
      >
        {/* aui-assistant-message-avatar */}
        <div className="ring-border bg-background col-start-1 row-start-1 flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
          <StarIcon size={14} />
        </div>

        {/* aui-assistant-message-content */}
        <div
          ref={contentRef}
          className="text-foreground col-span-2 col-start-2 row-start-1 ml-4 leading-7 wrap-break-words"
        >
          <MessagePrimitive.Content components={components} />
          <MessageError />
        </div>

        <AssistantActionBar threadId={threadId} />

        {/* aui-assistant-branch-picker */}
        <BranchPicker className="col-start-2 row-start-2 mr-2 -ml-2" />
      </motion.div>
    </MessagePrimitive.Root>
  );
};

/**
 * Cleans up the stop icon by unmounting the React root and removing the container.
 * Unmounting is deferred to avoid race conditions with React's render cycle.
 */
const cleanupStopIcon = (
  rootRef: RefObject<Root | null>,
  containerRef: RefObject<HTMLSpanElement | null>,
  specificRoot?: Root | null
) => {
  const rootToUnmount = specificRoot ?? rootRef.current;
  if (rootToUnmount) {
    // Defer unmount to avoid race condition with React's render cycle
    setTimeout(() => {
      // If specificRoot was provided, only unmount if it's still the current root
      // Otherwise, unmount the current root if it exists
      if (specificRoot) {
        if (rootRef.current === specificRoot) {
          specificRoot.unmount();
          if (rootRef.current === specificRoot) {
            rootRef.current = null;
          }
        }
      } else if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
      }
    }, 0);
  }
  if (containerRef.current) {
    containerRef.current.remove();
    containerRef.current = null;
  }
};
