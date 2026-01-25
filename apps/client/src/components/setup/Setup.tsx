import { Paper, Title, Box } from "@mantine/core";
import { useState } from "react";

import { useNetwork } from "../../contexts/network";
import { useSettingsStore } from "../../store/useSettingsStore";

import { ConnectForm, type ConnectFormValues } from "./ConnectForm";

export function Setup() {
  const networkService = useNetwork();
  const settings = useSettingsStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: ConnectFormValues) => {
    setLoading(true);
    setError(null);

    // Update store with form values
    settings.setServerUrl(values.serverUrl);
    settings.setRoomId(values.roomId);
    settings.setTransportMode(values.transportMode);
    settings.setPollingInterval(values.pollingInterval);
    settings.setPingInterval(values.pingInterval);
    settings.setDeveloperMode(values.developerMode);

    try {
      await networkService.joinRoom(values.secret);
    } catch (err) {
      setError("Failed to connect: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maw={400} mt={"xl"} mx={"auto"}>
      <Paper p={"md"} radius={"md"} shadow={"sm"} withBorder>
        <Title mb={"lg"} order={2} ta={"center"}>
          Connect to Room
        </Title>
        <ConnectForm error={error} loading={loading} onSubmit={handleSubmit} />
      </Paper>
    </Box>
  );
}
