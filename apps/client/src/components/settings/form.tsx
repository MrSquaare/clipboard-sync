import {
  ActionIcon,
  Box,
  Button,
  Center,
  Divider,
  Group,
  NumberInput,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";
import {
  IconBoxAlignBottomLeft,
  IconClipboard,
  IconCloudDataConnection,
  IconCode,
  IconGizmo,
  IconPingPong,
  IconPlayerPlay,
  IconServer,
  IconUsers,
  IconWindowMinimize,
  IconX,
} from "@tabler/icons-react";
import type { FC } from "react";

import type { SettingsFormValues } from "../../schemas/settings-form";

export type SettingsFormProps = {
  form: UseFormReturnType<SettingsFormValues>;
  onSubmit: (values: SettingsFormValues) => Promise<void>;
  onClose: () => void;
  onResetServerURL: () => void;
  connected: boolean;
};

export const SettingsForm: FC<SettingsFormProps> = ({
  form,
  onSubmit,
  onClose,
  onResetServerURL,
  connected,
}) => {
  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap={"md"}>
        <Stack gap={"md"}>
          <Text fw={600}>Connection</Text>

          <TextInput
            description={"Server to connect to (for signaling and relay)"}
            disabled={connected}
            label={"Server URL"}
            leftSection={<IconServer size={16} />}
            placeholder={"wss://..."}
            rightSection={
              <ActionIcon
                color={"gray"}
                disabled={connected}
                onClick={() => onResetServerURL()}
                variant={"subtle"}
              >
                <IconX size={16} />
              </ActionIcon>
            }
            withAsterisk
            {...form.getInputProps("serverUrl")}
          />

          <Stack gap={0}>
            <Text size={"sm"}>Transport Mode</Text>
            <Text c={"dimmed"} size={"xs"}>
              How data is transmitted between clients
            </Text>
            <SegmentedControl
              data={[
                {
                  label: (
                    <Center style={{ gap: 10 }}>
                      <IconGizmo size={16} />
                      <Text size={"sm"}>Auto</Text>
                    </Center>
                  ),
                  value: "auto",
                },
                {
                  label: (
                    <Center style={{ gap: 10 }}>
                      <IconUsers size={16} />
                      <Text size={"sm"}>P2P</Text>
                    </Center>
                  ),
                  value: "p2p",
                },
                {
                  label: (
                    <Center style={{ gap: 10 }}>
                      <IconCloudDataConnection size={16} />
                      <Text size={"sm"}>Relay</Text>
                    </Center>
                  ),
                  value: "relay",
                },
              ]}
              disabled={connected}
              {...form.getInputProps("transportMode")}
            />
          </Stack>
        </Stack>

        <Divider />

        <Stack gap={"md"}>
          <Text fw={600}>Behavior</Text>

          <Switch
            label={
              <Group>
                <IconPlayerPlay size={16} />
                <Box>
                  <Text size={"sm"}>Launch on system start</Text>
                  <Text c={"dimmed"} size={"xs"}>
                    Start when the system starts
                  </Text>
                </Box>
              </Group>
            }
            styles={{
              track: {
                margin: "auto 0",
              },
            }}
            {...form.getInputProps("launchOnStart", { type: "checkbox" })}
          />

          <Switch
            label={
              <Group>
                <IconBoxAlignBottomLeft size={16} />
                <Box>
                  <Text size={"sm"}>Minimize to tray on start</Text>
                  <Text c={"dimmed"} size={"xs"}>
                    Minimize to the system tray when starting the app
                  </Text>
                </Box>
              </Group>
            }
            styles={{
              track: {
                margin: "auto 0",
              },
            }}
            {...form.getInputProps("minimizeOnStart", { type: "checkbox" })}
          />

          <Switch
            label={
              <Group>
                <IconWindowMinimize size={16} />
                <Box>
                  <Text size={"sm"}>Minimize to tray on close</Text>
                  <Text c={"dimmed"} size={"xs"}>
                    Minimize to the system tray when closing the app
                  </Text>
                </Box>
              </Group>
            }
            styles={{
              track: {
                margin: "auto 0",
              },
            }}
            {...form.getInputProps("minimizeOnClose", { type: "checkbox" })}
          />
        </Stack>

        <Divider />

        <Stack gap={"md"}>
          <Text fw={600}>Advanced</Text>

          <NumberInput
            description={
              "How often the server is pinged to keep the connection alive"
            }
            label={"Ping Interval (ms)"}
            leftSection={<IconPingPong size={16} />}
            min={10000}
            step={1000}
            {...form.getInputProps("pingInterval")}
          />

          <NumberInput
            description={"How often the clipboard is checked for changes"}
            label={"Polling Interval (ms)"}
            leftSection={<IconClipboard size={16} />}
            min={100}
            step={100}
            {...form.getInputProps("pollingInterval")}
          />

          <Switch
            label={
              <Group>
                <IconCode size={16} />
                <Box>
                  <Text size={"sm"}>Developer mode</Text>
                  <Text c={"dimmed"} size={"xs"}>
                    Enable additional logging and features for debugging
                  </Text>
                </Box>
              </Group>
            }
            styles={{
              track: {
                margin: "auto 0",
              },
            }}
            {...form.getInputProps("developerMode", { type: "checkbox" })}
          />
        </Stack>

        <Group justify={"flex-end"}>
          <Button onClick={onClose} variant={"subtle"}>
            Cancel
          </Button>
          <Button type={"submit"} variant={"light"}>
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
