import * as DeepL from "deepl-node";

const authKey = process.env.DEEPL_API_KEY;

export const deepl = new DeepL.DeepLClient(authKey ?? "fail");

export function localeToTargetLanguageCode(
  locale: string
): DeepL.TargetLanguageCode {
  switch (locale) {
    case "en":
      return "en-US";
    case "pt-BR":
      return "pt-BR";
    case "de":
      return "de";
    default:
      throw new Error(`Unsupported locale: ${locale}`);
  }
}

export function localeToSourceLanguageCode(
  locale: string
): DeepL.SourceLanguageCode {
  switch (locale) {
    case "en":
      return "en";
    case "pt-BR":
      return "pt";
    case "de":
      return "de";
    default:
      throw new Error(`Unsupported locale: ${locale}`);
  }
}
