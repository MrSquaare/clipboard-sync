import { Card, Group, Text, ScrollArea, Table } from "@mantine/core";
import { IconBug } from "@tabler/icons-react";

import { useLogStore } from "../../store/useLogStore";

export function DebugLogCard() {
  const { logs } = useLogStore();

  return (
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
                      borderRight: "1px solid var(--mantine-color-dark-6)",
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
  );
}
