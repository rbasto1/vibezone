import { db } from "./connection";
import type { NewSuggestionGroup } from "./schema";
import { suggestionGroups } from "./schema";

async function seed() {
  console.info("🌱 Seeding database...");

  // Seed suggestion groups
  const suggestionGroupsData: NewSuggestionGroup[] = [
    {
      id: "flagship",
      icon: "Star",
      title: "Flagship Models",
      label: "Try the best models of the leading AI companies",
      promoted: true,
      models: [
        "openai/gpt-5",
        "anthropic/claude-sonnet-4",
        "google/gemini-2.5-pro",
      ],
    },
    {
      id: "coder",
      icon: "Code2",
      title: "Best Coders",
      label: "Compare the abilities of the best models for vibe coding",
      promoted: true,
      models: ["anthropic/claude-sonnet-4", "openai/gpt-5", "x-ai/grok-4"],
    },
    {
      id: "roleplay",
      icon: "Drama",
      title: "Roleplay Masters",
      label: "Chat with the best models for roleplay",
      promoted: true,
      models: [
        "google/gemini-2.5-flash",
        "deepseek/deepseek-chat-v3.1",
        "mistralai/mistral-nemo",
      ],
    },
    {
      id: "fast",
      icon: "Zap",
      title: "Fast Models",
      label: "Quick responses with efficient models",
      promoted: false,
      models: [
        "meta-llama/llama-3.3-8b-instruct:free",
        "mistralai/ministral-8b",
        "ai21/jamba-mini-1.7",
      ],
    },
  ];

  try {
    await db
      .insert(suggestionGroups)
      .values(suggestionGroupsData)
      .onConflictDoNothing();
    console.info("✅ Suggestion groups seeded successfully");
  } catch (error) {
    console.error("❌ Failed to seed suggestion groups:", error);
  }

  console.info(
    "🌱 Seeding complete. Use the /manage endpoint to sync with the APIs for models."
  );
  process.exit(0);
}

seed();
