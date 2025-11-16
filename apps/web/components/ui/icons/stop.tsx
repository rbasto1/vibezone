import type { FC, SVGProps } from "react";

export const StopIcon: FC<SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="11" strokeWidth="1" />
    <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor" />
  </svg>
);
