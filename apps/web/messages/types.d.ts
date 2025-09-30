// This file validates that all the language files are complete
import type de from "./de.json";
import type en from "./en.json";
import type ptBR from "./pt-BR.json";

type Messages = typeof en;

type EnsurePTBR = ptBR extends Messages ? true : never;
type EnsureDE = de extends Messages ? true : never;

declare const _ensurePTBR: EnsurePTBR;
declare const _ensureDE: EnsureDE;
export type { de, Messages, ptBR };
