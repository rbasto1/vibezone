import { useCallback, useMemo } from "react";

import { useUser } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/server/server";

type FavoritesOutput = RouterOutputs["users"]["favorites"];
const EMPTY_FAVORITES: FavoritesOutput = [];

const sortByFavoritedAtDesc = (
  a: FavoritesOutput[number],
  b: FavoritesOutput[number]
) => {
  const aTime = a.favoritedAt?.getTime() ?? 0;
  const bTime = b.favoritedAt?.getTime() ?? 0;
  return bTime - aTime;
};

export const useModelFavorites = () => {
  const user = useUser();
  const utils = trpc.useUtils();

  const favoritesQuery = trpc.users.favorites.useQuery(undefined, {
    enabled: !!user,
  });

  const toggleMutation = trpc.users.toggleFavorite.useMutation({
    onMutate: async ({ modelId }) => {
      if (!user) return undefined;
      await utils.users.favorites.cancel();
      const previous = utils.users.favorites.getData();
      utils.users.favorites.setData(undefined, (old) => {
        const current = old ?? [];
        const exists = current.some((item) => item.modelId === modelId);
        if (exists) {
          return current.filter((item) => item.modelId !== modelId);
        }
        return [{ modelId, favoritedAt: new Date() }, ...current].sort(
          sortByFavoritedAtDesc
        );
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        utils.users.favorites.setData(undefined, context.previous);
      }
    },
    onSuccess: (result, { modelId }) => {
      if (!user) return;
      utils.users.favorites.setData(undefined, (old) => {
        const current = old ?? [];
        const withoutCurrent = current.filter(
          (item) => item.modelId !== modelId
        );
        if (!result.favorited || !result.favoritedAt) {
          return withoutCurrent;
        }
        return [
          { modelId, favoritedAt: result.favoritedAt },
          ...withoutCurrent,
        ].sort(sortByFavoritedAtDesc);
      });
    },
  });

  const favorites = favoritesQuery.data ?? EMPTY_FAVORITES;

  const favoriteIdSet = useMemo(() => {
    return new Set(favorites.map((item) => item.modelId));
  }, [favorites]);

  const isFavorite = useCallback(
    (modelId: string) => favoriteIdSet.has(modelId),
    [favoriteIdSet]
  );

  const toggleFavorite = useCallback(
    (modelId: string) => {
      if (!user) return;
      toggleMutation.mutate({ modelId });
    },
    [toggleMutation, user]
  );

  return {
    favorites,
    hasFavorites: !!favorites.length,
    isFavorite,
    toggleFavorite,
    isToggling: toggleMutation.isPending,
    isLoadingFavorites: favoritesQuery.isLoading,
    user,
  };
};
