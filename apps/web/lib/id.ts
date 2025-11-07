import type { PanelConfig } from "@/store/panels";

export const generateChatId = () => {
  const randomNumber = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  return randomNumber.toString(36);
};

export const generateThreadId = (order: number) => {
  const randomNumber = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  return order.toString(16) + "-" + randomNumber.toString(36);
};

export const getNextThreadOrderFromExisting = (
  existing: PanelConfig[]
): number => {
  const maxPrevOrder = existing.reduce((max, { id }) => {
    const [orderStr] = id.split("-") || 0;
    return Math.max(max, Number(orderStr));
  }, existing.length - 1);
  return maxPrevOrder + 1;
};
