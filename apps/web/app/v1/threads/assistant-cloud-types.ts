import type { UIMessage } from "ai";

// see packages/assistant-cloud/dist/index.d.ts
export type CloudThread = {
  title: string;
  last_message_at: Date;
  metadata: unknown;
  external_id: string | null;
  id: string;
  project_id: string;
  created_at: Date;
  updated_at: Date;
  workspace_id: string;
  is_archived: boolean;
};

export type CloudMessage = {
  id: string;
  parent_id: string | null;
  height: number;
  created_at: Date;
  updated_at: Date;
  format: "ai-sdk/v5";
  content: AISDKStorageFormat;
};

// see node_modules/.pnpm/assistant-stream@0.2.23/node_modules/assistant-stream/src/utils/json/json-value.ts
export type ReadonlyJSONValue =
  | null
  | string
  | number
  | boolean
  | ReadonlyJSONObject
  | ReadonlyJSONArray;

export type ReadonlyJSONObject = {
  readonly [key: string]: ReadonlyJSONValue;
};

export type ReadonlyJSONArray = readonly ReadonlyJSONValue[];

// see (github)assistant-ui/packages/react/src/cloud/auiV0.ts
export type AuiV0MessageMessagePart =
  | {
      readonly type: "text";
      readonly text: string;
    }
  | {
      readonly type: "reasoning";
      readonly text: string;
    }
  | {
      readonly type: "source";
      readonly sourceType: "url";
      readonly id: string;
      readonly url: string;
      readonly title?: string;
    }
  | {
      readonly type: "tool-call";
      readonly toolCallId: string;
      readonly toolName: string;
      readonly args: ReadonlyJSONObject;
      readonly result?: ReadonlyJSONValue;
      readonly isError?: true;
    }
  | {
      readonly type: "tool-call";
      readonly toolCallId: string;
      readonly toolName: string;
      readonly argsText: string;
      readonly result?: ReadonlyJSONValue;
      readonly isError?: true;
    };

export type AISDKStorageFormat = Omit<UIMessage, "id">;
