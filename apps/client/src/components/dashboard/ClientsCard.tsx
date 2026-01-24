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

import { useAppStore } from "../../store/useAppStore";
import { getStatusColor } from "../../utils/color";

export function ClientsCard() {
  const { clients } = useAppStore();

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Group gap="xs">
            <IconDevices size={20} />
            <Text fw={500}>Connected Clients</Text>
          </Group>
          <Badge variant="light" size="lg" circle>
            {clients.length}
          </Badge>
        </Group>
      </Card.Section>

      <Stack mt="md" gap="sm">
        {clients.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            No other clients connected.
          </Text>
        ) : (
          clients.map((p) => (
            <Paper key={p.id} p="sm" withBorder bg="dark.8">
              <Group justify="space-between">
                <Group gap="xs">
                  <ThemeIcon variant="light" color="gray" size="sm">
                    <IconUser size={12} />
                  </ThemeIcon>
                  <Text size="sm" fw={500}>
                    {p.id.slice(0, 8)}...
                  </Text>
                </Group>
                <Group gap="xs">
                  <Badge
                    size="sm"
                    variant="dot"
                    color={getStatusColor(p.status)}
                  >
                    {p.status}
                  </Badge>
                  <Badge size="sm" variant="outline" color="gray">
                    {p.type}
                  </Badge>
                </Group>
              </Group>
            </Paper>
          ))
        )}
      </Stack>
    </Card>
  );
}
