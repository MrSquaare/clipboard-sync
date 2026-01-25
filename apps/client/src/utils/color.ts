export const getStatusColor = (status: string) => {
  switch (status) {
    case "connected":
      return "green";
    case "connecting":
      return "yellow";
    case "disconnected":
      return "red";
    default:
      return "gray";
  }
};
