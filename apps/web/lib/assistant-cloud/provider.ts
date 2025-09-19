import { AssistantCloud } from "assistant-cloud";
import { SITE_URL } from "../constants";

export const getGlobalAssistantCloud = (token: string, userId: string) => {
  return new AssistantCloud({
    baseUrl: process.env.NEXT_PUBLIC_SITE_URL || SITE_URL,
    apiKey: token,
    userId,
    workspaceId: "",
  });
};
