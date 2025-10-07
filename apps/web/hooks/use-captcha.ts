import { atom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";

export const MAX_CAPTCHA_AGE_MS = 1000 * 60 * 55; // 5 minutes before the backend start rejecting the token

export let captchaToken: string | null = null;

export interface CaptchaState {
  expiresAt: number | null;
}

export const captchaStateAtom = atom<CaptchaState>({
  expiresAt: null,
});

export const useCaptchaStateValue = () => {
  return useAtomValue(captchaStateAtom);
};

export const useCaptchaTokenSetter = () => {
  const set = useSetAtom(captchaStateAtom);
  return useCallback(
    (newToken: string) => {
      captchaToken = newToken; // immediate effect, doesn't depend on re-render for components to see it
      const expiresAt = Date.now() + MAX_CAPTCHA_AGE_MS;
      set({ expiresAt });
    },
    [set]
  );
};

export const useCaptchaState = () => {
  return [useCaptchaStateValue(), useCaptchaTokenSetter()] as const;
};
