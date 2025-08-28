import { Assistant, type PanelConfig } from "./assistant";
import { randomUUID } from "crypto";

export default function Home() {
  const initialPanels: PanelConfig[] = [
    {
      id: randomUUID(),
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.1,
    },
    {
      id: randomUUID(),
      provider: "anthropic",
      model: "claude-3-5-sonnet",
      temperature: 0.1,
    },
  ];

  return <Assistant initialPanels={initialPanels} />;
}
