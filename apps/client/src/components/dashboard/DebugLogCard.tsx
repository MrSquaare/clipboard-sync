import { Card, Group, Text, ScrollArea, Table } from "@mantine/core";
import { IconBug } from "@tabler/icons-react";

import { useLogStore } from "../../store/useLogStore";

export function DebugLogCard() {
  const { logs } = useLogStore();

  return (
    <Card padding={"lg"} radius={"md"} shadow={"sm"} withBorder>
      <Card.Section inheritPadding py={"xs"} withBorder>
        <Group gap={"xs"}>
          <IconBug size={20} />
          <Text fw={500}>Debug Log</Text>
        </Group>
      </Card.Section>

      <Card.Section>
        <ScrollArea bg={"#1e1e1e"} h={400} offsetScrollbars type={"auto"}>
          <Table
            highlightOnHover
            style={{ tableLayout: "fixed" }}
            verticalSpacing={"xs"}
          >
            <Table.Tbody>
              {logs.map((log) => (
                <Table.Tr key={log.id}>
                  <Table.Td
                    style={{
                      verticalAlign: "top",
                      borderRight: "1px solid var(--mantine-color-dark-6)",
                    }}
                    w={100}
                  >
                    <Text c={"dimmed"} ff={"monospace"} size={"xs"}>
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
                      c={
                        log.type === "error"
                          ? "red.4"
                          : log.type === "success"
                            ? "green.4"
                            : "gray.5"
                      }
                      ff={"monospace"}
                      size={"xs"}
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
