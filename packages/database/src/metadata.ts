import type { MessageRate } from "@vibezone/database";

export interface MessageMetadata {
  custom?: MetadataCustom;
}

export interface MessageMetadataAssistantUI {
  readonly unstable_state?: undefined;
  readonly unstable_annotations?: undefined;
  readonly unstable_data?: undefined;
  readonly steps?: undefined;
  readonly submittedFeedback?: undefined;
  custom?: MetadataCustom;
}

export interface SystemMessageInstructionProjectSnapshot {
  id: string;
  name: string;
  color: string;
}

export interface SystemMessageInstruction {
  id: string;
  title: string;
  contentStartAt: number;
  contentLength: number;
  project: SystemMessageInstructionProjectSnapshot | null;
}

export interface SystemMessageMemory {
  id: string;
  title: string;
  contentStartAt: number;
  contentLength: number;
  project: SystemMessageInstructionProjectSnapshot | null;
}

export interface MetadataCustom {
  saved?: boolean;
  rate?: MessageRate;
  modelId?: string;
  startTime?: number;
  endTime?: number;
  instructions?: SystemMessageInstruction[];
  memories?: SystemMessageMemory[];
}
