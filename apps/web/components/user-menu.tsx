"use client";

import { dark } from "@clerk/themes";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { useUIStateSetter } from "@/hooks/use-ui-state";
import { useUser } from "@/lib/auth-client";
import { SignInButton, useAuth, UserButton } from "@clerk/nextjs";
import { Settings2Icon, UserCircleIcon } from "lucide-react";
import { Button } from "./ui/button";

export const UserMenu = () => {
  const t = useTranslations("UserMenu");
  const setUIState = useUIStateSetter();
  const { resolvedTheme } = useTheme();
  const user = useUser();
  const clerkState = useAuth();

  const theme = resolvedTheme === "dark" ? dark : ("simple" as const);

  if (!user) {
    return (
      <SignInButton appearance={{ theme }} mode="modal">
        <Button variant="outline">{t("signInButton")}</Button>
      </SignInButton>
    );
  }

  if (user && !clerkState.isLoaded) {
    return (
      <div className="h-8 px-0 mx-0 -mt-1 gap-2 flex items-center">
        {user?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.imageUrl}
            alt={user.firstName || t("fallbackName")}
            className="size-7 rounded-full"
            referrerPolicy="no-referrer"
            rel="noreferrer noopener"
          />
        ) : (
          <UserCircleIcon className="size-5" />
        )}
        <span className="sr-only">{t("profileMenu")}</span>
      </div>
    );
  }

  return (
    <div className="h-8 min-w-7">
      <UserButton
        appearance={{
          theme,
          elements: {
            userButtonPopoverCard: { pointerEvents: "initial" },
          },
        }}
        userProfileProps={{
          appearance: { theme },
        }}
      >
        <UserButton.MenuItems>
          <UserButton.Action
            onClick={() => setUIState({ panelOpen: "preferences" })}
            label={t("preferences")}
            labelIcon={<Settings2Icon size={16} />}
          />
        </UserButton.MenuItems>
      </UserButton>
    </div>
  );
};
