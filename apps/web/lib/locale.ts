export function getModelOriginalLocale(id: string) {
  const providerId = id.split("/")[0];
  switch (providerId) {
    case "maritacaai":
      return "pt-BR";
    default:
      return "en";
  }
}
