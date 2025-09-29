import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";

export const ClientOnly = ({ children }: PropsWithChildren) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
};
