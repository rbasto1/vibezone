"use client";

export const ADD_AI_TRIGGER_EVENT = "vibezone:add-ai-trigger";

export const requestAddAiPanel = () => {
  if (typeof dispatchEvent === "undefined") return;
  dispatchEvent(new Event(ADD_AI_TRIGGER_EVENT));
};
