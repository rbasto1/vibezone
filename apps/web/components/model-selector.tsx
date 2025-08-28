"use client";

import { trpc } from "@/lib/trpc/client";
import Image from "next/image";

export const ModelSelector = () => {
  const { data: providers, isLoading: providersLoading } =
    trpc.providers.getAll.useQuery();
  const { data: models, isLoading: modelsLoading } =
    trpc.models.getIncluded.useQuery();

  if (providersLoading || modelsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Providers</h3>
        <div className="grid grid-cols-2 gap-2">
          {providers?.map((provider) => (
            <div key={provider.id} className="p-2 border rounded">
              {provider.iconUrl && (
                <Image
                  src={provider.iconUrl}
                  alt={provider.name}
                  width={24}
                  height={24}
                  className="inline mr-2"
                />
              )}
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
              <div className="font-medium">{model.name}</div>
              <div className="text-sm text-gray-600">
                Provider: {model.providerId}
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
