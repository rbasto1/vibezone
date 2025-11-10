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

export interface MetadataCustom {
  saved?: boolean;
  rate?: MessageRate;
  modelId?: string;
  startTime?: number;
  endTime?: number;
}
