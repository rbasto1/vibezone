import { baseUrl } from "./base-url";

export const siteName =
  baseUrl === "https://www.multipla.ia.br"
    ? ("Multipla IA" as const)
    : ("Vibezone" as const);
export const siteDomain =
  siteName === "Multipla IA"
    ? ("multipla.ia.br" as const)
    : ("vibezone.ai" as const);
export const siteDescription =
  siteName === "Multipla IA"
    ? "Teste, compare e avalie modelos de IA lado a lado com a Multipla IA."
    : "Test, compare, and evaluate AI models side-by-side with Vibezone.";
