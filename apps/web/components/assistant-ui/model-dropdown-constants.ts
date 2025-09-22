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
  { id: "leaders" as const, label: "Leaders", Icon: Crown },
  { id: "challengers" as const, label: "Challengers", Icon: Mountain },
  { id: "specialists" as const, label: "Specialists", Icon: Wand2 },
];
export const tierOptionsOrder: (typeof tierOptions)[number]["id"][] = [
  "leaders",
  "challengers",
  "specialists",
];

// Icon color per tier
export const tierColor: Record<(typeof tierOptions)[number]["id"], string> = {
  leaders: "text-yellow-400 dark:text-yellow-300",
  challengers: "text-foreground/80",
  specialists: "text-foreground/80",
};

export const capabilityOptions = [
  { id: "capVision" as const, label: "Can see images", Icon: Eye },
  { id: "capPdf" as const, label: "Can read PDFs", Icon: FaRegFilePdf },
  { id: "capReason" as const, label: "Reasoning", Icon: Brain },
  {
    id: "capImageGen" as const,
    label: "Can generate images",
    Icon: ImageIcon,
  },
  { id: "capTools" as const, label: "Tools Use", Icon: Wrench },
];

// Icon color per capability (stroke inherits currentColor)
export const capabilityColor: Record<
  (typeof capabilityOptions)[number]["id"],
  string
> = {
  capVision: "text-sky-600 dark:text-sky-400",
  capPdf: "text-emerald-600 dark:text-emerald-400",
  capReason: "text-violet-600 dark:text-violet-400",
  capImageGen: "text-pink-600 dark:text-pink-400",
  capTools: "text-zinc-600 dark:text-zinc-400",
};
