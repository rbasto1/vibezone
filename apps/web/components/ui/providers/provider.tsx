// Provider icons reused from the existing ModelSelector component
import { cn } from "@/components/ui/utils";
import type { FC } from "react";

import AI21Icon from "./ai21";
import AionLabsIcon from "./aionlabs";
import AnthropicIcon from "./anthropic";
import BaiduIcon from "./baidu";
import CohereIcon from "./cohere";
import DeepSeekIcon from "./deepseek";
import GeminiIcon from "./gemini";
import GoogleIcon from "./google";
import MetaIcon from "./meta";
import MicrosoftIcon from "./microsoft";
import MistralIcon from "./mistral";
import MoonshotIcon from "./moonshot";
import OpenAIIcon from "./openai";
import QwenIcon from "./qwen";
import TencentIcon from "./tencent";
import XAIIcon from "./xai";
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
  microsoft: MicrosoftIcon,
  mistralai: MistralIcon,
  moonshotai: MoonshotIcon,
  qwen: QwenIcon,
  tencent: TencentIcon,
  "x-ai": XAIIcon,
  "z-ai": ZAIIcon,
  "aion-labs": AionLabsIcon,
};

export const ProviderIcon: FC<ProviderIconProps> = ({
  providerId,
  className,
}) => {
  const Icon = providerIcons[providerId];
  return Icon ? <Icon className={cn("inline mr-1 size-4", className)} /> : null;
};
