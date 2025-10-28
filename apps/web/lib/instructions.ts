import type { InstructionConfig } from "@/store/instructions";

const sortByOrder = (a: InstructionConfig, b: InstructionConfig) =>
  a.order - b.order;

export const filterInstructionsForProject = (
  instructions: InstructionConfig[],
  projectId: string | null
) =>
  instructions
    .filter(
      (instruction) =>
        instruction.isActive &&
        (instruction.projectId === null || instruction.projectId === projectId)
    )
    .sort(sortByOrder);

export const composeInstructionPrompt = (
  basePrompt: string,
  instructionList: InstructionConfig[],
  projectId: string | null
): string | null => {
  const segments = [
    basePrompt?.trim() ?? "",
    ...filterInstructionsForProject(instructionList, projectId)
      .map((instruction) => instruction.content.trim())
      .filter((content) => content.length > 0),
  ].filter((segment) => segment.length > 0);

  if (!segments.length) {
    return null;
  }

  return segments.join("\n\n");
};
