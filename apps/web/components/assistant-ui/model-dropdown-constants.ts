import {
  Brain,
  Crown,
  Eye,
  Image as ImageIcon,
  Mountain,
  Wand2,
  Wrench,
} from "lucide-react";
import { FaRegFilePdf } from "react-icons/fa";

// Filters: provider tiers and model flags
export const tierOptions = [
  {
    id: "leaders" as const,
    labelKey: "tiers.leaders" as const,
    Icon: Crown,
    color: "text-yellow-400 dark:text-yellow-300",
  },
  {
    id: "challengers" as const,
    labelKey: "tiers.challengers" as const,
    Icon: Mountain,
    color: "text-foreground/80",
  },
  {
    id: "specialists" as const,
    labelKey: "tiers.specialists" as const,
    Icon: Wand2,
    color: "text-foreground/80",
  },
];
export const capabilityOptions = [
  {
    id: "capVision" as const,
    labelKey: "capabilities.vision" as const,
    Icon: Eye,
    color: "text-sky-600 dark:text-sky-400",
  },
  {
    id: "capPdf" as const,
    labelKey: "capabilities.pdf" as const,
    Icon: FaRegFilePdf,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "capReason" as const,
    labelKey: "capabilities.reasoning" as const,
    Icon: Brain,
    color: "text-violet-600 dark:text-violet-400",
  },
  {
    id: "capImageGen" as const,
    labelKey: "capabilities.imageGeneration" as const,
    Icon: ImageIcon,
    color: "text-pink-600 dark:text-pink-400",
  },
  {
    id: "capTools" as const,
    labelKey: "capabilities.tools" as const,
    Icon: Wrench,
    color: "text-zinc-600 dark:text-zinc-400",
  },
];

export type TierOptionId = (typeof tierOptions)[number]["id"];
export type CapabilityOptionId = (typeof capabilityOptions)[number]["id"];
