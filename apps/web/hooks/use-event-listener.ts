import { useEffect } from "react";

export function useEventListener(type: string, callback: () => void) {
  useEffect(() => {
    const handler = () => callback();
    window.addEventListener(type, handler);
    return () => {
      window.removeEventListener(type, handler);
    };
  }, [callback, type]);
}
