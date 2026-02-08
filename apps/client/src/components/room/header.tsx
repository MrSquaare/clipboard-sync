import { Button, Group, Paper, Text, ThemeIcon, Title } from "@mantine/core";
import { IconLogout, IconPlugConnected, IconUser } from "@tabler/icons-react";
import type { FC } from "react";

import { useSettingsStore } from "../../stores/settings";

export type RoomHeaderProps = {
  onDisconnect: () => void;
};

export const RoomHeader: FC<RoomHeaderProps> = ({ onDisconnect }) => {
  const { roomId, clientName } = useSettingsStore();

  return (
    <Paper mb={"lg"} p={"md"} radius={"md"} shadow={"xs"} withBorder>
      <Group align={"center"} justify={"space-between"}>
        <Group>
          <ThemeIcon radius={"md"} size={"lg"} variant={"light"}>
            <IconPlugConnected size={20} />
          </ThemeIcon>
          <Title order={3}>Room: {roomId}</Title>
        </Group>

        <Group>
          <Paper bg={"dark.8"} p={7} radius={"sm"} withBorder>
            <Group gap={"xs"}>
              <IconUser size={14} />
              <Text size={"sm"} span>
                {clientName}
              </Text>
            </Group>
          </Paper>
          <Button
            color={"red"}
            leftSection={<IconLogout size={14} />}
            onClick={onDisconnect}
            variant={"light"}
          >
            Disconnect
          </Button>
        </Group>
      </Group>
    </Paper>
  );
};
