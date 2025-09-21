// Simple title generator for chat sessions
export function generateTitle(message: string): string {
  // Extract key words from the message
  const words = message.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 5);

  if (words.length === 0) {
    return 'New Chat';
  }

  // Create title from first few words
  const title = words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return title.length > 30 ? title.substring(0, 30) + '...' : title;
}
