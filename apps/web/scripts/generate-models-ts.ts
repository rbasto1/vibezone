import * as fs from "fs";

import { listModels } from "@/lib/trpc/models-list";

const dstFolder = "../generated";

async function main() {
  const currentPath = import.meta.url;
  const fullFilename = new URL(`${dstFolder}/models.ts`, currentPath).pathname;
  const fullPath = fullFilename.substring(0, fullFilename.lastIndexOf("/"));

  const models = await listModels();
  models.models.forEach(cleanup);
  models.providers.forEach(cleanup);

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath);
  }
  const prevSize = fs.existsSync(fullFilename)
    ? fs.statSync(fullFilename).size
    : 1;
  const fileContents = [
    // build a js file that is easier to import
    'import type { GetModelsListReturn } from "@/lib/trpc/models";\n',
    "export const models = ",
    JSON.stringify(models),
    " as unknown as GetModelsListReturn;\n",
  ].join("");
  fs.writeFileSync(fullFilename, fileContents);
  const size = fs.statSync(fullFilename).size;
  const increasePercent = ((size - prevSize) / prevSize) * 100;
  const sign = increasePercent >= 0 ? "+" : "";

  console.info(
    `✅ Models JSON generated successfully: ${fullFilename} (${size} bytes, ${sign}${increasePercent.toFixed(1)}%)`
  );
}

main();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanup(obj: any) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === false || obj[key] === null) {
      delete obj[key];
    }
  });
  delete obj.createdAt;
  delete obj.updatedAt;
}
