"use client";

import type { CSSProperties, FC, PropsWithChildren } from "react";

import { cn } from "@/components/ui/utils";
import { useDraggable } from "@dnd-kit/core";

interface DraggableItemProps extends PropsWithChildren {
  id: string;
}

export const DraggableItem: FC<DraggableItemProps> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });

  const style: CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none",
        isDragging ? "cursor-grabbing opacity-60" : "cursor-grab"
      )}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
};
