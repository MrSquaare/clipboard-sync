export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

export function isClipboardEmptyError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  return message.includes("empty") || message.includes("no content");
}
