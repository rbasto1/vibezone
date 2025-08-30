"use client";

import AnthropicIcon from "@/components/ui/providers/anthropic";
import DeepSeekIcon from "@/components/ui/providers/deepseek";
import GeminiIcon from "@/components/ui/providers/gemini";
import OpenAIIcon from "@/components/ui/providers/openai";
import { modelsAtom } from "@/store/models";
import { useAtomValue } from "jotai";
import type { ComponentProps } from "react";

export const ModelSelector = () => {
  const hydrated = useAtomValue(modelsAtom);
  const models = hydrated.models;
  const providers = hydrated.providers;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Providers</h3>
        <div className="grid grid-cols-2 gap-2">
          {providers?.map((provider) => (
            <div key={provider.id} className="p-2 border rounded">
              {getProviderIcon(provider.id)}
              {provider.name}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Available Models</h3>
        <div className="space-y-2">
          {models?.map((model) => (
            <div key={model.id} className="p-2 border rounded">
              <div className="font-medium">
                {getProviderIcon(model.providerId)}
                {model.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const providerIcons: Record<string, React.FC<ComponentProps<"svg">>> = {
  openai: OpenAIIcon,
  anthropic: AnthropicIcon,
  gemini: GeminiIcon,
  deepseek: DeepSeekIcon,
};

function getProviderIcon(providerId: string): React.ReactNode {
  const Icon = providerIcons[providerId];
  return Icon ? <Icon className="inline mr-2 size-5" /> : null;
}
