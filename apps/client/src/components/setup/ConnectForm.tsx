import {
  TextInput,
  PasswordInput,
  Button,
  Select,
  NumberInput,
  Switch,
  Paper,
  Stack,
  Group,
  Collapse,
  Anchor,
  Alert,
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

import {
  useSettingsStore,
  type TransportMode,
} from "../../store/useSettingsStore";

export interface ConnectFormValues {
  serverUrl: string;
  roomId: string;
  secret: string;
  transportMode: TransportMode;
  pollingInterval: number;
  pingInterval: number;
  developerMode: boolean;
}

interface ConnectFormProps {
  onSubmit: (values: ConnectFormValues) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function ConnectForm({ onSubmit, loading, error }: ConnectFormProps) {
  const settings = useSettingsStore();
  const [showAdvanced, { toggle: toggleAdvanced }] = useDisclosure(false);

  const form = useForm<ConnectFormValues>({
    initialValues: {
      serverUrl: settings.serverUrl,
      roomId: settings.roomId,
      secret: "",
      transportMode: settings.transportMode,
      pollingInterval: settings.pollingInterval,
      pingInterval: settings.pingInterval,
      developerMode: settings.developerMode,
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

  const handleUseDefaultUrl = () => {
    form.setFieldValue("serverUrl", __DEFAULT_SERVER_URL__);
  };

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap={"md"}>
        <TextInput
          description={
            <Group gap={0} justify={"space-between"}>
              <span>WebSocket Server Address</span>
              <Anchor
                component={"button"}
                onClick={handleUseDefaultUrl}
                size={"xs"}
                type={"button"}
              >
                Use Default
              </Anchor>
            </Group>
          }
          label={"Server URL"}
          leftSection={<IconServer size={16} />}
          placeholder={"wss://..."}
          withAsterisk
          {...form.getInputProps("serverUrl")}
        />

        <TextInput
          label={"Room ID"}
          leftSection={<IconKey size={16} />}
          placeholder={"my-room"}
          withAsterisk
          {...form.getInputProps("roomId")}
        />

        <PasswordInput
          label={"Secret Key"}
          leftSection={<IconLock size={16} />}
          placeholder={"Shared secret"}
          withAsterisk
          {...form.getInputProps("secret")}
        />

        <Select
          data={[
            { value: "auto", label: "Auto" },
            { value: "p2p", label: "P2P Only" },
            { value: "relay", label: "Relay Only" },
          ]}
          label={"Transport Mode"}
          leftSection={<IconNetwork size={16} />}
          {...form.getInputProps("transportMode")}
        />

        <Button
          leftSection={
            showAdvanced ? (
              <IconChevronDown size={16} />
            ) : (
              <IconChevronRight size={16} />
            )
          }
          onClick={toggleAdvanced}
          size={"sm"}
          variant={"subtle"}
        >
          Advanced Settings
        </Button>

        <Collapse in={showAdvanced}>
          <Paper bg={"transparent"} mt={"sm"} p={"xs"} withBorder>
            <Stack gap={"sm"}>
              <NumberInput
                label={"Clipboard Polling (ms)"}
                min={100}
                {...form.getInputProps("pollingInterval")}
              />
              <NumberInput
                label={"Ping Interval (ms)"}
                min={5000}
                {...form.getInputProps("pingInterval")}
              />
              <Switch
                label={"Developer Mode"}
                {...form.getInputProps("developerMode", {
                  type: "checkbox",
                })}
              />
            </Stack>
          </Paper>
        </Collapse>

        {error && (
          <Alert
            color={"red"}
            icon={<IconAlertCircle size={16} />}
            title={"Error"}
            variant={"light"}
          >
            {error}
          </Alert>
        )}

        <Button fullWidth loading={loading} mt={"md"} type={"submit"}>
          Join Room
        </Button>
      </Stack>
    </form>
  );
}
