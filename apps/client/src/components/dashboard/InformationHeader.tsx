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
    <Paper mb={"lg"} p={"md"} radius={"md"} shadow={"xs"} withBorder>
      <Group align={"center"} justify={"space-between"}>
        <Group>
          <ThemeIcon radius={"md"} size={"lg"} variant={"light"}>
            <IconPlugConnected size={20} />
          </ThemeIcon>
          <div>
            <Title order={3}>Room: {roomId}</Title>
            <Group gap={4}>
              <IconServer color={"var(--mantine-color-dark-2)"} size={14} />
              <Text c={"dark.2"} size={"xs"}>
                {serverUrl}
              </Text>
            </Group>
          </div>
        </Group>

        <Group>
          <Paper bg={"dark.8"} p={7} radius={"sm"} withBorder>
            <Group gap={"xs"}>
              <IconUser size={14} />
              <Text size={"sm"} span>
                ID:
                <Code bg={"transparent"} c={"dark.2"}>
                  {myId?.slice(0, 8)}
                </Code>
              </Text>
            </Group>
          </Paper>
          <Button
            color={"red"}
            leftSection={<IconLogout size={16} />}
            onClick={() => networkService.disconnect()}
            variant={"light"}
          >
            Disconnect
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}
