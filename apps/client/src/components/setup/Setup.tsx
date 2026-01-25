import { Paper, Title, Box, Center } from "@mantine/core";
import { useState } from "react";

import { useNetwork } from "../../contexts/network";
import { useSettingsStore } from "../../store/useSettingsStore";

import { Form, type FormValues } from "./Form";

export function Setup() {
  const networkService = useNetwork();
  const settings = useSettingsStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);

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
    <Center h={"100vh"} p={"md"}>
      <Box maw={600} w={"100%"}>
        <Paper p={"md"} radius={"md"} shadow={"sm"} withBorder>
          <Title mb={"lg"} order={2} ta={"center"}>
            Connect to Room
          </Title>
          <Form
            error={error}
            initialValues={{
              serverUrl: settings.serverUrl,
              roomId: settings.roomId,
              secret: "",
              transportMode: settings.transportMode,
              pollingInterval: settings.pollingInterval,
              pingInterval: settings.pingInterval,
              developerMode: settings.developerMode,
            }}
            loading={loading}
            onSubmit={handleSubmit}
          />
        </Paper>
      </Box>
    </Center>
  );
}
