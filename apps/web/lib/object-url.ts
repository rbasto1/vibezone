export const createObjectUrl = (
  data: string,
  mimeType: string,
): string | null => {
  if (typeof window === "undefined") return null;

  const value = data.trim();
  if (!value) return null;

  if (value.startsWith("blob:")) return value;
  if (value.startsWith("http")) return value;
  if (value.startsWith("data:")) return value;

  const normalized = value.includes(",") ? value.split(",").at(-1) ?? value : value;
  const binary = window.atob(normalized);
  const length = binary.length;
  const bytes = new Uint8Array(length);

  for (let index = 0; index < length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes], {
    type: mimeType || "application/octet-stream",
  });

  return URL.createObjectURL(blob);
};
