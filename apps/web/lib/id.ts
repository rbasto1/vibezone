export const generateChatId = () => {
  const randomNumber = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  return randomNumber.toString(36);
};
