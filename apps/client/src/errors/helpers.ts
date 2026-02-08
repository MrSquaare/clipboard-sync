export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

export function isSecureStorageMissingEntryError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("no matching entry") && message.includes("secure storage")
  );
}

export function isClipboardEmptyError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  return message.includes("empty") || message.includes("no content");
}
