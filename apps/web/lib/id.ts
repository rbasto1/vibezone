export const generateChatId = () => {
  const randomNumber = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  return randomNumber.toString(36);
};

export const generateThreadId = (order: number) => {
  const randomNumber = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  return order.toString(16) + "-" + randomNumber.toString(36);
};
