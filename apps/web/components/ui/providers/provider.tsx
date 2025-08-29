// Provider icons reused from the existing ModelSelector component
import AnthropicIcon from "@/components/ui/providers/anthropic";
import DeepSeekIcon from "@/components/ui/providers/deepseek";
import GeminiIcon from "@/components/ui/providers/gemini";
import OpenAIIcon from "@/components/ui/providers/openai";
import { cn } from "@/components/ui/utils";
import type { FC } from "react";

interface ProviderIconProps {
  providerId: string;
  className?: string;
}

const providerIcons: Record<string, React.FC<React.ComponentProps<"svg">>> = {
  openai: OpenAIIcon,
  anthropic: AnthropicIcon,
  gemini: GeminiIcon,
  deepseek: DeepSeekIcon,
};

export const ProviderIcon: FC<ProviderIconProps> = ({
  providerId,
  className,
}) => {
  const Icon = providerIcons[providerId];
  return Icon ? <Icon className={cn("inline mr-1 size-4", className)} /> : null;
};
