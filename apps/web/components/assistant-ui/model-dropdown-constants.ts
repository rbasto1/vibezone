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
    label: "Leaders",
    Icon: Crown,
    color: "text-yellow-400 dark:text-yellow-300",
  },
  {
    id: "challengers" as const,
    label: "Challengers",
    Icon: Mountain,
    color: "text-foreground/80",
  },
  {
    id: "specialists" as const,
    label: "Specialists",
    Icon: Wand2,
    color: "text-foreground/80",
  },
];
export const capabilityOptions = [
  {
    id: "capVision" as const,
    label: "Can see images",
    Icon: Eye,
    color: "text-sky-600 dark:text-sky-400",
  },
  {
    id: "capPdf" as const,
    label: "Can read PDFs",
    Icon: FaRegFilePdf,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "capReason" as const,
    label: "Reasoning",
    Icon: Brain,
    color: "text-violet-600 dark:text-violet-400",
  },
  {
    id: "capImageGen" as const,
    label: "Can generate images",
    Icon: ImageIcon,
    color: "text-pink-600 dark:text-pink-400",
  },
  {
    id: "capTools" as const,
    label: "Tools Use",
    Icon: Wrench,
    color: "text-zinc-600 dark:text-zinc-400",
  },
];
