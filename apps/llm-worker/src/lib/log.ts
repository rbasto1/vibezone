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
        if (!obj.length) {
          return "[]";
        }
        if (obj.every((elem) => elem === null)) {
          return `["null[${len}]"]`;
        }
        for (const type of ["string", "number", "boolean", "bigint"] as const) {
          let hasNull = false;
          if (
            obj.every((elem) => {
              if (elem === null) {
                hasNull = true;
                return true;
              }
              return typeof elem === type;
            })
          ) {
            return `["${type}${hasNull ? "?" : ""}[${len}]"]`;
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
