import {
  ActionIcon,
  Container,
  Group,
  SimpleGrid,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconSettings } from "@tabler/icons-react";

import { RoomClients } from "../components/room/clients";
import { RoomHeader } from "../components/room/header";
import { RoomLogs } from "../components/room/logs";
import { SettingsModal } from "../components/settings/modal";
import { useClipboardSync } from "../hooks/use-clipboard-sync";
import { useConnection } from "../hooks/use-connection";
import { useSettingsStore } from "../stores/settings";

export function RoomScreen(): React.JSX.Element {
  const settings = useSettingsStore();
  const [settingsOpened, { open: openSettings, close: closeSettings }] =
    useDisclosure(false);

  const { disconnect } = useConnection();

  useClipboardSync();

  const handleDisconnect = async () => {
    settings.update({
      saveSecret: false,
      autoConnectOnStart: false,
    });

    await disconnect();
  };

  return (
    <>
      <SettingsModal onClose={closeSettings} opened={settingsOpened} />
      <Container py={"md"} size={"lg"}>
        <Group justify={"flex-end"} mb={"xs"}>
          <Tooltip label={"Settings"}>
            <ActionIcon onClick={openSettings} variant={"subtle"}>
              <IconSettings size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <RoomHeader onDisconnect={handleDisconnect} />
        <SimpleGrid
          cols={{ base: 1, md: settings.developerMode ? 2 : 1 }}
          spacing={"lg"}
        >
          <RoomClients />
          {settings.developerMode && <RoomLogs />}
        </SimpleGrid>
      </Container>
    </>
  );
}
