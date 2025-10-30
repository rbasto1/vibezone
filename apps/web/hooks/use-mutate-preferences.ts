import { useCallback } from "react";

import { trpc } from "@/lib/trpc/client";
import type { PreferencesAtom } from "@/store/preferences";
import { useUserPreferencesSetter } from "./use-user-preferences";

type UpdatablePreferenceKey = keyof PreferencesAtom;
type PreferenceUpdates = Partial<Pick<PreferencesAtom, UpdatablePreferenceKey>>;

export type UpdatePreferencesMutationErrorFunction = NonNullable<
  Parameters<
    ReturnType<typeof trpc.users.updatePreferences.useMutation>["mutate"]
  >[1]
>["onError"];
export type UpdatePreferencesMutationSuccessFunction = NonNullable<
  Parameters<
    ReturnType<typeof trpc.users.updatePreferences.useMutation>["mutate"]
  >[1]
>["onSuccess"];

interface UseMutatePreferencesOptions {
  onError?: UpdatePreferencesMutationErrorFunction;
}

interface MutatePreferencesOptions {
  onError?: UpdatePreferencesMutationErrorFunction;
  onSuccess?: UpdatePreferencesMutationSuccessFunction;
  skipLocalUpdate?: boolean;
  previousValues: Partial<PreferencesAtom>;
}

export const useMutatePreferences = (
  options: UseMutatePreferencesOptions = {}
) => {
  const setPreferences = useUserPreferencesSetter();
  const updatePreferences = trpc.users.updatePreferences.useMutation();
  const { onError: globalOnError } = options;

  return useCallback(
    (updates: PreferenceUpdates, mutateOptions: MutatePreferencesOptions) => {
      const {
        onError,
        onSuccess,
        skipLocalUpdate = false,
        previousValues,
      } = mutateOptions;

      if (!skipLocalUpdate) {
        setPreferences((prev) => ({ ...prev, ...updates }));
      }

      void updatePreferences.mutate(updates, {
        onSuccess,
        onError: (error, variables, onMutateResult, context) => {
          setPreferences((prev) => ({ ...prev, ...previousValues }));
          onError?.(error, variables, onMutateResult, context);
          globalOnError?.(error, variables, onMutateResult, context);
        },
      });
    },
    [globalOnError, setPreferences, updatePreferences]
  );
};
