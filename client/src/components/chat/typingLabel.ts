export const formatTypingLabel = (typingNames: string[]) => {
  const names = typingNames
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  if (names.length === 0) {
    return null;
  }

  if (names.length === 1) {
    return `${names[0]} is typing...`;
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing...`;
  }

  if (names.length === 3) {
    return `${names[0]}, ${names[1]}, and ${names[2]} are typing...`;
  }

  const remainingCount = names.length - 2;
  const remainingLabel = remainingCount === 1 ? "1 other" : `${remainingCount} others`;

  return `${names[0]}, ${names[1]}, and ${remainingLabel} are typing...`;
};
