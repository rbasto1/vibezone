import { atom, useAtom, useSetAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";

const COMPOSER_PROMPT_STORAGE_KEY = "vz_composer_prompt";

const composerPromptAtom =
  typeof window !== "undefined"
    ? atomWithStorage<string>(
        COMPOSER_PROMPT_STORAGE_KEY,
        "",
        createJSONStorage(() => window.sessionStorage),
        { getOnInit: true }
      )
    : atom<string>("");

export const useComposerPrompt = () => {
  return useAtom(composerPromptAtom);
};

export const useComposerPromptSetter = () => {
  return useSetAtom(composerPromptAtom);
};
