import { config } from "dotenv";

import { db } from "./connection";
import { models, providers } from "./schema";

// Load environment variables from .env file
config();

const providersData = [
  {
    id: "openai",
    name: "OpenAI",
    iconUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    iconUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/3a/Anthropic_logo.svg",
  },
  {
    id: "gemini",
    name: "Google",
    iconUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg",
  },
];

const modelsData = [
  // OpenAI Models
  {
    id: "gpt-4o",
    providerId: "openai",
    name: "GPT-4o",
    isPremium: true,
    isIncluded: true,
    capabilityFast: true,
    capabilityVision: true,
    capabilityPdf: true,
    capabilityReasoning: true,
    capabilityImageGeneration: false,
    capabilityTools: true,
    capabilityEffortControl: false,
  },
  {
    id: "gpt-4o-mini",
    providerId: "openai",
    name: "GPT-4o Mini",
    isPremium: false,
    isIncluded: true,
    capabilityFast: true,
    capabilityVision: true,
    capabilityPdf: true,
    capabilityReasoning: false,
    capabilityImageGeneration: false,
    capabilityTools: true,
    capabilityEffortControl: false,
  },
  {
    id: "gpt-4-turbo",
    providerId: "openai",
    name: "GPT-4 Turbo",
    isPremium: true,
    isIncluded: true,
    capabilityFast: true,
    capabilityVision: true,
    capabilityPdf: true,
    capabilityReasoning: true,
    capabilityImageGeneration: false,
    capabilityTools: true,
    capabilityEffortControl: false,
  },
  {
    id: "gpt-4",
    providerId: "openai",
    name: "GPT-4",
    isPremium: true,
    isIncluded: true,
    capabilityFast: false,
    capabilityVision: false,
    capabilityPdf: false,
    capabilityReasoning: true,
    capabilityImageGeneration: false,
    capabilityTools: true,
    capabilityEffortControl: false,
  },
  {
    id: "gpt-3.5-turbo",
    providerId: "openai",
    name: "GPT-3.5 Turbo",
    isPremium: false,
    isIncluded: true,
    capabilityFast: true,
    capabilityVision: false,
    capabilityPdf: false,
    capabilityReasoning: false,
    capabilityImageGeneration: false,
    capabilityTools: true,
    capabilityEffortControl: false,
  },

  // Anthropic Models
  {
    id: "claude-3.5-sonnet",
    providerId: "anthropic",
    name: "Claude 3.5 Sonnet",
    isPremium: false,
    isIncluded: true,
    capabilityFast: true,
    capabilityVision: true,
    capabilityPdf: true,
    capabilityReasoning: false,
    capabilityImageGeneration: false,
    capabilityTools: true,
    capabilityEffortControl: false,
  },
  {
    id: "claude-3.5-haiku",
    providerId: "anthropic",
    name: "Claude 3.5 Haiku",
    isPremium: false,
    isIncluded: true,
    capabilityFast: true,
    capabilityVision: true,
    capabilityPdf: true,
    capabilityReasoning: false,
    capabilityImageGeneration: false,
    capabilityTools: true,
    capabilityEffortControl: false,
  },
  {
    id: "claude-3-opus",
    providerId: "anthropic",
    name: "Claude 3 Opus",
    isPremium: true,
    isIncluded: true,
    capabilityFast: false,
    capabilityVision: true,
    capabilityPdf: true,
    capabilityReasoning: true,
    capabilityImageGeneration: false,
    capabilityTools: true,
    capabilityEffortControl: true,
  },
  {
    id: "claude-3-sonnet",
    providerId: "anthropic",
    name: "Claude 3 Sonnet",
    isPremium: true,
    isIncluded: true,
    capabilityFast: true,
    capabilityVision: true,
    capabilityPdf: true,
    capabilityReasoning: true,
    capabilityImageGeneration: false,
    capabilityTools: true,
    capabilityEffortControl: true,
  },
  {
    id: "claude-3-haiku",
    providerId: "anthropic",
    name: "Claude 3 Haiku",
    isPremium: false,
    isIncluded: true,
    capabilityFast: true,
    capabilityVision: true,
    capabilityPdf: true,
    capabilityReasoning: false,
    capabilityImageGeneration: false,
    capabilityTools: true,
    capabilityEffortControl: false,
  },

  // Gemini Models
  {
    id: "gemini-1.5-pro",
    providerId: "gemini",
    name: "Gemini 1.5 Pro",
    isPremium: true,
    isIncluded: true,
    capabilityFast: false,
    capabilityVision: true,
    capabilityPdf: true,
    capabilityReasoning: true,
    capabilityImageGeneration: false,
    capabilityTools: true,
    capabilityEffortControl: false,
  },
  {
    id: "gemini-1.5-flash",
    providerId: "gemini",
    name: "Gemini 1.5 Flash",
    isPremium: false,
    isIncluded: true,
    capabilityFast: true,
    capabilityVision: true,
    capabilityPdf: true,
    capabilityReasoning: false,
    capabilityImageGeneration: false,
    capabilityTools: true,
    capabilityEffortControl: false,
  },
  {
    id: "gemini-pro",
    providerId: "gemini",
    name: "Gemini Pro",
    isPremium: false,
    isIncluded: true,
    capabilityFast: true,
    capabilityVision: false,
    capabilityPdf: false,
    capabilityReasoning: false,
    capabilityImageGeneration: false,
    capabilityTools: true,
    capabilityEffortControl: false,
  },
];

async function seed() {
  console.info("🌱 Seeding database...");

  try {
    // Insert providers
    console.info("📝 Inserting providers...");
    await db.insert(providers).values(providersData);
    console.info(`✅ Inserted ${providersData.length} providers`);

    // Insert models
    console.info("🤖 Inserting models...");
    await db.insert(models).values(modelsData);
    console.info(`✅ Inserted ${modelsData.length} models`);

    console.info("🎉 Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();
