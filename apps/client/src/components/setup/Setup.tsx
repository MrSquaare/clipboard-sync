import {
  TextInput,
  PasswordInput,
  Button,
  Select,
  NumberInput,
  Switch,
  Paper,
  Title,
  Stack,
  Group,
  Collapse,
  Anchor,
  Alert,
  Box,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconServer,
  IconKey,
  IconLock,
  IconNetwork,
  IconAlertCircle,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react";
import { useState } from "react";

import { useNetwork } from "../../contexts/network";
import { useSettingsStore } from "../../store/useSettingsStore";

export function Setup() {
  const networkService = useNetwork();
  const {
    serverUrl,
    setServerUrl,
    roomId,
    setRoomId,
    transportMode,
    setTransportMode,
    pollingInterval,
    setPollingInterval,
    pingInterval,
    setPingInterval,
    developerMode,
    setDeveloperMode,
  } = useSettingsStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, { toggle: toggleAdvanced }] = useDisclosure(false);

  const form = useForm({
    initialValues: {
      serverUrl: serverUrl,
      roomId: roomId,
      secret: "",
      transportMode: transportMode,
      pollingInterval: pollingInterval,
      pingInterval: pingInterval,
      developerMode: developerMode,
    },
    validate: {
      serverUrl: (value) => (!value ? "Server URL is required" : null),
      roomId: (value) => (!value ? "Room ID is required" : null),
      secret: (value) => (!value ? "Secret Key is required" : null),
      pollingInterval: (value) =>
        value < 100 ? "Polling interval must be at least 100ms" : null,
      pingInterval: (value) =>
        value < 5000 ? "Ping interval must be at least 5000ms" : null,
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError("");

    // Update store with form values
    setServerUrl(values.serverUrl);
    setRoomId(values.roomId);
    setTransportMode(values.transportMode);
    setPollingInterval(values.pollingInterval);
    setPingInterval(values.pingInterval);
    setDeveloperMode(values.developerMode);

    try {
      await networkService.joinRoom(values.secret);
    } catch (err) {
      setError("Failed to connect: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maw={400} mx="auto" mt="xl">
      <Paper p="md" shadow="sm" radius="md" withBorder>
        <Title order={2} ta="center" mb="lg">
          Connect to Room
        </Title>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Server URL"
              description={
                <Group justify="space-between" gap={0}>
                  <span>WebSocket Server Address</span>
                  <Anchor
                    component="button"
                    type="button"
                    size="xs"
                    onClick={() =>
                      form.setFieldValue("serverUrl", __DEFAULT_SERVER_URL__)
                    }
                  >
                    Use Default
                  </Anchor>
                </Group>
              }
              placeholder="wss://..."
              leftSection={<IconServer size={16} />}
              withAsterisk
              {...form.getInputProps("serverUrl")}
            />

            <TextInput
              label="Room ID"
              placeholder="my-room"
              leftSection={<IconKey size={16} />}
              withAsterisk
              {...form.getInputProps("roomId")}
            />

            <PasswordInput
              label="Secret Key"
              placeholder="Shared secret"
              leftSection={<IconLock size={16} />}
              withAsterisk
              {...form.getInputProps("secret")}
            />

            <Select
              label="Transport Mode"
              data={[
                { value: "auto", label: "Auto (Mesh)" },
                { value: "p2p", label: "P2P Only" },
                { value: "relay", label: "Relay Only" },
              ]}
              leftSection={<IconNetwork size={16} />}
              {...form.getInputProps("transportMode")}
            />

            <Button
              variant="subtle"
              onClick={toggleAdvanced}
              leftSection={
                showAdvanced ? (
                  <IconChevronDown size={16} />
                ) : (
                  <IconChevronRight size={16} />
                )
              }
              size="sm"
            >
              Advanced Settings
            </Button>

            <Collapse in={showAdvanced}>
              <Paper withBorder p="xs" mt="sm" bg="transparent">
                <Stack gap="sm">
                  <NumberInput
                    label="Clipboard Polling (ms)"
                    min={100}
                    {...form.getInputProps("pollingInterval")}
                  />
                  <NumberInput
                    label="Ping Interval (ms)"
                    min={5000}
                    {...form.getInputProps("pingInterval")}
                  />
                  <Switch
                    label="Developer Mode"
                    {...form.getInputProps("developerMode", {
                      type: "checkbox",
                    })}
                  />
                </Stack>
              </Paper>
            </Collapse>

            {error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Error"
                color="red"
                variant="light"
              >
                {error}
              </Alert>
            )}

            <Button type="submit" loading={loading} fullWidth mt="md">
              Join Room
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
