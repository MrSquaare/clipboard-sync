import { useAppStore } from "../store/useAppStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { networkService } from "../services/NetworkService";
import {
  Container,
  Paper,
  Group,
  Stack,
  Title,
  Text,
  Badge,
  Button,
  SimpleGrid,
  Card,
  ThemeIcon,
  ScrollArea,
  Code,
  Table,
} from "@mantine/core";
import {
  IconPlugConnected,
  IconLogout,
  IconServer,
  IconUser,
  IconDevices,
  IconBug,
} from "@tabler/icons-react";

export function Dashboard() {
  const { myId, clients, logs } = useAppStore();
  const { roomId, serverUrl, developerMode } = useSettingsStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "green";
      case "connecting":
        return "yellow";
      case "disconnected":
        return "red";
      default:
        return "gray";
    }
  };

  return (
    <Container size="lg" py="md">
      {/* Header */}
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

      <SimpleGrid cols={{ base: 1, md: developerMode ? 2 : 1 }} spacing="lg">
        {/* Connected Clients */}
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

        {/* Debug Log */}
        {developerMode && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Card.Section withBorder inheritPadding py="xs">
              <Group gap="xs">
                <IconBug size={20} />
                <Text fw={500}>Debug Log</Text>
              </Group>
            </Card.Section>

            <Card.Section>
              <ScrollArea h={400} type="auto" offsetScrollbars bg="#1e1e1e">
                <Table
                  highlightOnHover
                  verticalSpacing="xs"
                  style={{ tableLayout: "fixed" }}
                >
                  <Table.Tbody>
                    {logs.map((log) => (
                      <Table.Tr key={log.id}>
                        <Table.Td
                          w={100}
                          style={{
                            verticalAlign: "top",
                            borderRight:
                              "1px solid var(--mantine-color-dark-6)",
                          }}
                        >
                          <Text size="xs" c="dimmed" ff="monospace">
                            {new Date(log.timestamp).toLocaleTimeString([], {
                              hour12: false,
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text
                            size="xs"
                            ff="monospace"
                            c={
                              log.type === "error"
                                ? "red.4"
                                : log.type === "success"
                                  ? "green.4"
                                  : "gray.5"
                            }
                            style={{
                              wordBreak: "break-word",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {log.message}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Card.Section>
          </Card>
        )}
      </SimpleGrid>
    </Container>
  );
}
