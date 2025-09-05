"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

export const LogoutButton = () => {
  return (
    <Button onClick={signOut} variant="destructive">
      Logout
    </Button>
  );
};
