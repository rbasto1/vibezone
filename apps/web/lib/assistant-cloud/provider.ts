import { AssistantCloud } from "assistant-cloud";
import { baseUrl } from "../base-url";

export const getGlobalAssistantCloud = (token: string, userId: string) => {
  return new AssistantCloud({
    baseUrl,
    apiKey: token,
    userId,
    workspaceId: "",
  });
};
