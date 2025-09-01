// Provider icons reused from the existing ModelSelector component
import AI21Icon from "@/components/ui/providers/ai21";
import AnthropicIcon from "@/components/ui/providers/anthropic";
import BaiduIcon from "@/components/ui/providers/baidu";
import CohereIcon from "@/components/ui/providers/cohere";
import DeepSeekIcon from "@/components/ui/providers/deepseek";
import GeminiIcon from "@/components/ui/providers/gemini";
import GoogleIcon from "@/components/ui/providers/google";
import MetaIcon from "@/components/ui/providers/meta";
import MistralIcon from "@/components/ui/providers/mistral";
import OpenAIIcon from "@/components/ui/providers/openai";
import QwenIcon from "@/components/ui/providers/qwen";
import TencentIcon from "@/components/ui/providers/tencent";
import XAIIcon from "@/components/ui/providers/xai";
import { cn } from "@/components/ui/utils";
import type { FC } from "react";
import ZAIIcon from "./z-ai";

interface ProviderIconProps {
  providerId: string;
  className?: string;
}

const providerIcons: Record<string, React.FC<React.ComponentProps<"svg">>> = {
  openai: OpenAIIcon,
  anthropic: AnthropicIcon,
  gemini: GeminiIcon,
  deepseek: DeepSeekIcon,
  google: GoogleIcon,
  ai21: AI21Icon,
  baidu: BaiduIcon,
  cohere: CohereIcon,
  "meta-llama": MetaIcon,
  mistralai: MistralIcon,
  qwen: QwenIcon,
  tencent: TencentIcon,
  "x-ai": XAIIcon,
  "z-ai": ZAIIcon,
};

export const ProviderIcon: FC<ProviderIconProps> = ({
  providerId,
  className,
}) => {
  const Icon = providerIcons[providerId];
  return Icon ? <Icon className={cn("inline mr-1 size-4", className)} /> : null;
};
