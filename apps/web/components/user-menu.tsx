"use client";

import { dark } from "@clerk/themes";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { useUIStateSetter } from "@/hooks/use-ui-state";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Settings2Icon } from "lucide-react";
import { Button } from "./ui/button";

export const UserMenu = () => {
  const t = useTranslations("UserMenu");
  const setUIState = useUIStateSetter();
  const { resolvedTheme } = useTheme();
  const user = useUser();

  const theme = resolvedTheme === "dark" ? dark : ("simple" as const);

  if (!user.isSignedIn) {
    return (
      <SignInButton appearance={{ theme }} mode="modal">
        <Button variant="outline">{t("signInButton")}</Button>
      </SignInButton>
    );
  }

  return (
    <UserButton
      appearance={{ theme }}
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
  );
};
