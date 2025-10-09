export function summarize(obj: unknown): string {
  if (obj === null) {
    return "∅";
  }
  switch (typeof obj) {
    case "string":
      return `"string(${obj.length})"`;
    case "undefined":
      return '"undefined"';
    case "bigint":
    case "number":
    case "boolean":
      return obj.toString();
    case "object":
      if (Array.isArray(obj)) {
        const len = obj.length;
        for (const type of ["string", "number", "boolean", "bigint"] as const) {
          if (obj.every((elem) => typeof elem === type)) {
            return `["${type}[${len}]"]`;
          }
        }
        return "[" + obj.map(summarize).join(", ") + "]";
      }
      return (
        "{" +
        Object.entries(obj)
          .map(([key, value]): string => `${key}: ${summarize(value)}`)
          .join(", ") +
        "}"
      );
    default:
      return typeof obj;
  }
}
