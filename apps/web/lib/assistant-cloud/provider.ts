import { AssistantCloud } from "assistant-cloud";

export const getGlobalAssistantCloud = (token: string, userId: string) => {
  return new AssistantCloud({
    baseUrl: "/",
    apiKey: token,
    userId,
    workspaceId: "",
  });
};
