import { AssistantCloud } from "assistant-cloud";

export const getGlobalAssistantCloud = (token: string, userId: string) => {
  return new AssistantCloud({
    baseUrl: "http://localhost:3022",
    apiKey: token,
    userId,
    workspaceId: "",
  });
};
