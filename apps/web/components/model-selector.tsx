"use client";

import AnthropicIcon from "@/components/ui/providers/anthorpic";
import DeepSeekIcon from "@/components/ui/providers/deepseek";
import GeminiIcon from "@/components/ui/providers/gemini";
import OpenAIIcon from "@/components/ui/providers/openai";
import { trpc } from "@/lib/trpc/client";
import type { ComponentProps } from "react";

export const ModelSelector = () => {
  const { data: modelsQuery, isLoading: modelsLoading } =
    trpc.models.getWithProviders.useQuery(undefined, {
      staleTime: 1000 * 60 * 60,
    });

  if (modelsLoading) {
    return <div>Loading...</div>;
  }
  const models = modelsQuery?.models;
  const providers = modelsQuery?.providers;

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
              <div className="text-sm text-gray-600">
                {model.isPremium && (
                  <span className="ml-2 text-yellow-600">Premium</span>
                )}
                {model.isNew && (
                  <span className="ml-2 text-green-600">New</span>
                )}
                {model.isExperimental && (
                  <span className="ml-2 text-blue-600">Experimental</span>
                )}
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
