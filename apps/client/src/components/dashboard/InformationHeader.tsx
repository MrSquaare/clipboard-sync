import {
  Paper,
  Group,
  ThemeIcon,
  Title,
  Text,
  Code,
  Button,
} from "@mantine/core";
import {
  IconPlugConnected,
  IconServer,
  IconUser,
  IconLogout,
} from "@tabler/icons-react";

import { useNetwork } from "../../contexts/network";
import { useNetworkStore } from "../../store/useNetworkStore";
import { useSettingsStore } from "../../store/useSettingsStore";

export function InformationHeader() {
  const { roomId, serverUrl } = useSettingsStore();
  const { myId } = useNetworkStore();
  const networkService = useNetwork();

  return (
    <Paper p="md" shadow="xs" radius="md" withBorder mb="lg">
      <Group justify="space-between" align="center">
        <Group>
          <ThemeIcon size="lg" radius="md" variant="light">
            <IconPlugConnected size={20} />
          </ThemeIcon>
          <div>
            <Title order={3}>Room: {roomId}</Title>
            <Group gap="xs">
              <IconServer size={14} style={{ opacity: 0.5 }} />
              <Text size="xs" c="dimmed">
                {serverUrl}
              </Text>
            </Group>
          </div>
        </Group>

        <Group>
          <Paper px="xs" py={4} withBorder radius="sm" bg="dark.8">
            <Group gap={6}>
              <IconUser size={14} style={{ opacity: 0.7 }} />
              <Text size="sm" fw={500} span>
                ID:
              </Text>
              <Code bg="transparent" c="dimmed">
                {myId?.slice(0, 8)}
              </Code>
            </Group>
          </Paper>
          <Button
            color="red"
            variant="light"
            leftSection={<IconLogout size={16} />}
            onClick={() => networkService.disconnect()}
          >
            Disconnect
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}
