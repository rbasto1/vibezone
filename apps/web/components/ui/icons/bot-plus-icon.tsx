import type { FC, SVGProps } from "react";
import { cn } from "../utils";

export const BotPlusIcon: FC<SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="1 1 22 18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("lucide", className)}
    {...props}
  >
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
    <g>
      {/* Transparent knockout border */}
      <g
        stroke="background"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="1"
      >
        <path d="M16 7h6" />
        <path d="M19 4v6" />
      </g>
      {/* Main plus sign */}
      <g
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 7h6" />
        <path d="M19 4v6" />
      </g>
    </g>
  </svg>
);
