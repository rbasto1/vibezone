import * as DeepL from "deepl-node";

const authKey = process.env.DEEPL_API_KEY;
if (!authKey) throw new Error("Missing DEEPL_API_KEY");

export const deepl = new DeepL.DeepLClient(authKey);

export function localeToTargetLanguageCode(
  locale: string
): DeepL.TargetLanguageCode {
  switch (locale) {
    case "pt-BR":
      return "pt-BR";
    case "de":
      return "de";
    default:
      throw new Error(`Unsupported locale: ${locale}`);
  }
}
