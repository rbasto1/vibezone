import { atom, useAtomValue, useSetAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useCallback } from "react";

const CAPTCHA_STORAGE_KEY = "vz_captcha_state";
export const MAX_CAPTCHA_AGE_MS = 1000 * 60 * 55; // 5 minutes before the backend start rejecting the token

export let captchaToken: string | null = null;

interface PersistedCaptchaState {
  token: string | null;
  expiresAt: number | null;
}

interface SessionCaptchaState {
  requested: boolean;
}

export interface CaptchaAtomValue extends Omit<PersistedCaptchaState, "token"> {
  execution: CaptchaExecution;
  requested: boolean;
}

const execution = getCaptchaExecution();

const sessionCaptchaStateAtom = atom<SessionCaptchaState>({
  requested: false,
});

const persistedCaptchaStateAtom =
  typeof window !== "undefined"
    ? atomWithStorage<PersistedCaptchaState>(
        CAPTCHA_STORAGE_KEY,
        {
          token: null,
          expiresAt: null,
        },
        createJSONStorage(() => window.localStorage, {
          reviver: (key, value) => {
            switch (key) {
              case "execution":
                return getCaptchaExecution();
              case "token":
                if (typeof value !== "string") {
                  return null;
                }
                captchaToken = value;
                return value;
              case "requested":
                return false;
              default:
                return value;
            }
          },
        }),
        { getOnInit: true }
      )
    : atom<PersistedCaptchaState>({
        token: null,
        expiresAt: null,
      });

// Components should use `token` from the state, since it has a delay. We only have the
// `token` in the state for persisting in local storage
export const useCaptchaStateValue = (): CaptchaAtomValue => {
  const persisted = useAtomValue(persistedCaptchaStateAtom);
  const session = useAtomValue(sessionCaptchaStateAtom);
  return {
    ...persisted,
    ...session,
    execution,
  };
};

export const useCaptchaTokenSetter = () => {
  const setPersisted = useSetAtom(persistedCaptchaStateAtom);
  const setSession = useSetAtom(sessionCaptchaStateAtom);

  return useCallback(
    (token: string) => {
      // immediate effect, doesn't depend on re-render for components to see it, so the streaming starts immeditately
      captchaToken = token;

      // delays deleting the captcha container for the animation of the checkmark to finish
      const expiresAt = Date.now() + MAX_CAPTCHA_AGE_MS;
      setTimeout(() => {
        setSession((prev) => ({ ...prev, requested: false }));
        setPersisted((prev) => ({ ...prev, expiresAt, token }));
      }, 1000);
    },
    [setPersisted, setSession]
  );
};

export const useCaptchaRequested = () => {
  const setSession = useSetAtom(sessionCaptchaStateAtom);
  return useCallback(() => {
    setSession((prev) => ({ ...prev, requested: true }));
  }, [setSession]);
};

export const useCaptchaState = () => {
  return [useCaptchaStateValue(), useCaptchaTokenSetter()] as const;
};

export const useCaptchaFailed = () => {
  const setPersisted = useSetAtom(persistedCaptchaStateAtom);
  const setSession = useSetAtom(sessionCaptchaStateAtom);
  return useCallback(() => {
    captchaToken = null;
    setSession((prev) => ({ ...prev, requested: false }));
    setPersisted((prev) => ({ ...prev, expiresAt: 0, token: null }));
  }, [setPersisted, setSession]);
};

interface CaptchaExecution {
  promise: Promise<string>;
  resolve: (token: string) => void;
  reset: () => void;
}

function getCaptchaExecution(): CaptchaExecution {
  const response = {
    promise: null,
    resolve: () => {},
    reset: null,
  } as unknown as CaptchaExecution;

  response.reset = () => {
    response.promise = new Promise<string>((resolve) => {
      response.resolve = resolve;
    });
  };

  response.reset();

  return response;
}
