import {
  Badge,
  Card,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconDevices, IconUser } from "@tabler/icons-react";
import type { FC } from "react";

import { useClientsStore, type Client } from "../../stores/clients";

type ClientRowProps = {
  client: Client;
};

const ClientRow: FC<ClientRowProps> = ({ client }) => {
  return (
    <Paper bg={"dark.8"} key={client.id} p={"sm"} withBorder>
      <Group justify={"space-between"}>
        <Group gap={"xs"}>
          <ThemeIcon color={"gray"} size={"sm"} variant={"light"}>
            <IconUser size={12} />
          </ThemeIcon>
          <Text fw={500} size={"sm"}>
            {client.name}
          </Text>
        </Group>
        <Group gap={"xs"}>
          <Badge color={"gray"} size={"sm"} variant={"outline"}>
            {client.transport}
          </Badge>
        </Group>
      </Group>
    </Paper>
  );
};

export const RoomClients: FC = () => {
  const { list: clients } = useClientsStore();

  return (
    <Card padding={"lg"} radius={"md"} shadow={"sm"} withBorder>
      <Card.Section inheritPadding py={"xs"} withBorder>
        <Group justify={"space-between"}>
          <Group gap={"xs"}>
            <IconDevices size={20} />
            <Text fw={500}>Connected Clients</Text>
          </Group>
          <Badge circle size={"lg"} variant={"light"}>
            {clients.length}
          </Badge>
        </Group>
      </Card.Section>

      <Card.Section inheritPadding py={"xs"}>
        <Stack gap={"sm"}>
          {clients.length === 0 ? (
            <Text c={"dimmed"} py={"xl"} ta={"center"}>
              No other clients connected.
            </Text>
          ) : (
            clients.map((client) => (
              <ClientRow client={client} key={client.id} />
            ))
          )}
        </Stack>
      </Card.Section>
    </Card>
  );
};
