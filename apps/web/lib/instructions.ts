import type { InstructionConfig } from "@/store/instructions";
import type { ProjectConfig } from "@/store/projects";
import type { SystemMessageInstruction } from "@vibezone/database";

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

export interface InstructionPromptResult {
  prompt: string | null;
  instructions: SystemMessageInstruction[];
}

export const composeInstructionPrompt = (
  basePrompt: string,
  instructionList: InstructionConfig[],
  projectId: string | null,
  projects?: ProjectConfig[] | null
): InstructionPromptResult => {
  const projectLookup = new Map(
    (projects ?? []).map((project) => [project.id, project])
  );

  const segments: Array<{
    text: string;
    instruction?: InstructionConfig;
  }> = [];

  const trimmedBase = basePrompt?.trim() ?? "";
  if (trimmedBase.length) {
    segments.push({ text: trimmedBase });
  }

  for (const instruction of filterInstructionsForProject(
    instructionList,
    projectId
  )) {
    const trimmedContent = instruction.content.trim();
    if (!trimmedContent.length) continue;
    segments.push({ text: trimmedContent, instruction });
  }

  if (!segments.length) {
    return { prompt: null, instructions: [] };
  }

  let cursor = 0;
  let prompt = "";
  const instructions: SystemMessageInstruction[] = [];

  for (const segment of segments) {
    if (!segment.text.length) continue;
    if (prompt.length) {
      prompt += "\n\n";
      cursor += 2;
    }

    const startAt = cursor;
    prompt += segment.text;
    const length = segment.text.length;
    if (segment.instruction) {
      const project =
        segment.instruction.projectId &&
        projectLookup.get(segment.instruction.projectId);
      instructions.push({
        id: segment.instruction.id,
        title: segment.instruction.title,
        contentStartAt: startAt,
        contentLength: length,
        project: project
          ? {
              id: project.id,
              name: project.name,
              color: project.color,
            }
          : null,
      });
    }
    cursor += length;
  }

  return { prompt, instructions };
};
