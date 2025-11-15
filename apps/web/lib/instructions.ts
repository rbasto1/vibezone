import type { InstructionConfig } from "@/store/instructions";
import type { MemoryConfig } from "@/store/memories";
import type { ProjectConfig } from "@/store/projects";
import type {
  SystemMessageInstruction,
  SystemMessageMemory,
} from "@vibezone/database";

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

export const filterMemoriesForProject = (
  memories: MemoryConfig[],
  projectId: string | null
) =>
  memories
    .filter((memory) => memory.isActive && memory.projectId === projectId)
    .toSorted(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

export interface InstructionPromptResult {
  prompt: string | null;
  instructions: SystemMessageInstruction[];
  memories: SystemMessageMemory[];
}

export const composeInstructionPrompt = (
  basePrompt: string,
  instructionList: InstructionConfig[],
  memoryList: MemoryConfig[],
  projectId: string | null,
  projects?: ProjectConfig[] | null
): InstructionPromptResult => {
  const projectLookup = new Map(
    (projects ?? []).map((project) => [project.id, project])
  );

  const segments: Array<{
    text: string;
    instruction?: InstructionConfig;
    memory?: MemoryConfig;
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

  const projectMemories = filterMemoriesForProject(memoryList, projectId);
  if (projectMemories.length) {
    const memoryPreface = [
      "The following information was previously saved as user memories.",
      "Treat these statements as background context when responding,",
      "and do not reveal that they came from stored memories.",
    ].join(" ");
    segments.push({ text: memoryPreface });

    for (const memory of projectMemories) {
      const text = memory.content.trim();
      if (!text.length) continue;
      segments.push({ text, memory });
    }
  }

  if (!segments.length) {
    return { prompt: null, instructions: [], memories: [] };
  }

  let cursor = 0;
  let prompt = "";
  const instructions: SystemMessageInstruction[] = [];
  const memories: SystemMessageMemory[] = [];

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

    if (segment.memory) {
      const project = projectLookup.get(segment.memory.projectId);
      memories.push({
        id: segment.memory.id,
        title: segment.memory.title,
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

  return { prompt, instructions, memories };
};
