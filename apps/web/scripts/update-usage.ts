import { runUpdateUsage } from "@/app/api/jobs/update-usage/job";

function main() {
  const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Usage:\n\n  pnpm run update-usage <DATABASE_URL>\n");
    process.exit(1);
  }

  runUpdateUsage({ databaseUrl })
    .then((output) => console.info("Success:", output))
    .catch((error) => {
      console.error("Failed to update usage:", error);
      process.exit(1);
    });
}

main();
