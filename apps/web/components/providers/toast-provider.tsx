"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  if (theme !== "dark" && theme !== "light" && theme !== "system") {
    throw new Error(`Invalid theme ${theme}`);
  }

  return <Sonner theme={theme} {...props} />;
};

export { Toaster };
