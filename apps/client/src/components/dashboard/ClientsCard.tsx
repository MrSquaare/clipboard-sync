import {
  Card,
  Group,
  Badge,
  Stack,
  Text,
  Paper,
  ThemeIcon,
} from "@mantine/core";
import { IconDevices, IconUser } from "@tabler/icons-react";

import { useClientStore } from "../../store/useClientStore";
import { getStatusColor } from "../../utils/color";

export function ClientsCard() {
  const { clients } = useClientStore();

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
              No other client connected.
            </Text>
          ) : (
            clients.map((p) => (
              <Paper bg={"dark.8"} key={p.id} p={"sm"} withBorder>
                <Group justify={"space-between"}>
                  <Group gap={"xs"}>
                    <ThemeIcon color={"gray"} size={"sm"} variant={"light"}>
                      <IconUser size={12} />
                    </ThemeIcon>
                    <Text fw={500} size={"sm"}>
                      {p.id.slice(0, 8)}...
                    </Text>
                  </Group>
                  <Group gap={"xs"}>
                    <Badge
                      color={getStatusColor(p.status)}
                      size={"sm"}
                      variant={"dot"}
                    >
                      {p.status}
                    </Badge>
                    <Badge color={"gray"} size={"sm"} variant={"outline"}>
                      {p.type}
                    </Badge>
                  </Group>
                </Group>
              </Paper>
            ))
          )}
        </Stack>
      </Card.Section>
    </Card>
  );
}
